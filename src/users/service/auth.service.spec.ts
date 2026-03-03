import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../interfaces/user-role.enum';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtBlacklistService } from './jwt-blacklist.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository;
  let jwtService;
  let firebaseAdmin;
  let blacklistService;

  const mockUser = new User({
    id: 'uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    firebaseUid: 'firebase-uid-1',
    role: UserRole.USER,
  });

  const mockDecodedToken = {
    email: 'test@example.com',
    firebaseUid: 'firebase-uid-1',
    name: 'Test User',
  } as any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      decode: jest.fn(),
      verifyAsync: jest.fn(),
    };

    firebaseAdmin = {
      auth: jest.fn().mockReturnValue({
        revokeRefreshTokens: jest.fn(),
      }),
    };

    blacklistService = {
      add: jest.fn(),
      isRevoked: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: 'FIREBASE_ADMIN',
          useValue: firebaseAdmin,
        },
        {
          provide: JwtBlacklistService,
          useValue: blacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return auth response for existing user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.login(mockDecodedToken);

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should create and return new user if not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.login(mockDecodedToken);

      expect(userRepository.save).toHaveBeenCalled();
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if email is missing in token', async () => {
      const tokenWithoutEmail = { uid: 'uid' } as any;
      await expect(service.login(tokenWithoutEmail)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle race condition during user creation', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.save.mockRejectedValueOnce({ code: '23505' });
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      userRepository.save.mockResolvedValueOnce(mockUser);

      const result = await service.login(mockDecodedToken);

      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.login(mockDecodedToken)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('logout', () => {
    it('should blacklist the token', async () => {
      const mockRequest = { headers: { authorization: 'Bearer mock-token' } } as any;
      const mockPayload = { sub: 'uuid-1', exp: Math.floor(Date.now() / 1000) + 3600 };

      jwtService.decode.mockReturnValue(mockPayload);
      blacklistService.add.mockResolvedValue(undefined);

      await service.logout(mockRequest);

      expect(jwtService.decode).toHaveBeenCalledWith('mock-token');
      expect(blacklistService.add).toHaveBeenCalledWith('mock-token', expect.any(Number));
    });

    it('should not blacklist if token is missing', async () => {
      const mockRequest = { headers: {} } as any;

      await service.logout(mockRequest);

      expect(blacklistService.add).not.toHaveBeenCalled();
    });
  });
});
