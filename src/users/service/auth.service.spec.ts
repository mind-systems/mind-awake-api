import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../interfaces/user-role.enum';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository;
  let jwtService;
  let firebaseAdmin;

  const mockUser = new User({
    id: 'uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    firebase_uid: 'firebase-uid-1',
    role: UserRole.USER,
  });

  const mockDecodedToken = {
    email: 'test@example.com',
    uid: 'firebase-uid-1',
    name: 'Test User',
  } as any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    firebaseAdmin = {
      auth: jest.fn().mockReturnValue({
        revokeRefreshTokens: jest.fn(),
      }),
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
      expect(result.access_token).toBe('mock-jwt-token');
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
      userRepository.save.mockRejectedValue({ code: '23505' }); // Unique violation
      userRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.login(mockDecodedToken);

      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.login(mockDecodedToken)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('logout', () => {
    it('should call revokeRefreshTokens', async () => {
      const revokeSpy = firebaseAdmin.auth().revokeRefreshTokens;
      await service.logout('uid-1');
      expect(revokeSpy).toHaveBeenCalledWith('uid-1');
    });

    it('should throw InternalServerErrorException if revoke fails', async () => {
      firebaseAdmin.auth().revokeRefreshTokens.mockRejectedValue(new Error('Firebase Error'));
      await expect(service.logout('uid-1')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
