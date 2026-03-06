import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtBlacklistService } from './jwt-blacklist.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService;
  let blacklistService;

  beforeEach(async () => {
    const userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      decode: jest.fn(),
      verifyAsync: jest.fn(),
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
