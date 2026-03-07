import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OAuth2Client } from 'google-auth-library';
import { GoogleTokenService } from './google-token.service';

const MOCK_CLIENT_ID = 'test-client-id';
const MOCK_CLIENT_SECRET = 'test-client-secret';
const MOCK_REDIRECT_URI = 'http://localhost';

const MOCK_PAYLOAD = {
  sub: 'google-user-123',
  email: 'user@example.com',
  email_verified: true,
  name: 'John Doe',
};

function makeConfigService(): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: MOCK_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: MOCK_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: MOCK_REDIRECT_URI,
      };
      if (key in map) return map[key];
      throw new Error(`Missing config: ${key}`);
    },
  } as unknown as ConfigService;
}

describe('GoogleTokenService', () => {
  let service: GoogleTokenService;
  let getTokenSpy: jest.SpyInstance;
  let verifyIdTokenSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleTokenService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    service = module.get(GoogleTokenService);

    getTokenSpy = jest
      .spyOn(OAuth2Client.prototype, 'getToken')
      .mockImplementation(() =>
        Promise.resolve({ tokens: { id_token: 'mock-id-token' } } as any),
      );

    verifyIdTokenSpy = jest
      .spyOn(OAuth2Client.prototype, 'verifyIdToken')
      .mockImplementation(() =>
        Promise.resolve({ getPayload: () => MOCK_PAYLOAD } as any),
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('exchangeCodeForProfile', () => {
    it('returns GoogleProfile for a valid serverAuthCode', async () => {
      const result = await service.exchangeCodeForProfile('valid-auth-code');

      expect(getTokenSpy).toHaveBeenCalledWith('valid-auth-code');
      expect(verifyIdTokenSpy).toHaveBeenCalledWith({
        idToken: 'mock-id-token',
        audience: MOCK_CLIENT_ID,
      });
      expect(result).toEqual({
        googleId: 'google-user-123',
        email: 'user@example.com',
        name: 'John Doe',
      });
    });

    it('throws UnauthorizedException when getToken fails', async () => {
      getTokenSpy.mockRejectedValue(new Error('invalid_grant'));

      await expect(
        service.exchangeCodeForProfile('expired-auth-code'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired Google authorization code',
        ),
      );
      expect(verifyIdTokenSpy).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when id_token is missing in token response', async () => {
      getTokenSpy.mockResolvedValue({ tokens: {} } as any);

      await expect(
        service.exchangeCodeForProfile('valid-auth-code'),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid or expired Google authorization code',
        ),
      );
      expect(verifyIdTokenSpy).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when verifyIdToken fails', async () => {
      verifyIdTokenSpy.mockRejectedValue(new Error('Token used too late'));

      await expect(
        service.exchangeCodeForProfile('valid-auth-code'),
      ).rejects.toThrow(
        new UnauthorizedException('Google token verification failed'),
      );
    });

    it('falls back to email prefix when name is missing in payload', async () => {
      verifyIdTokenSpy.mockImplementation(() =>
        Promise.resolve({
          getPayload: () => ({
            sub: 'google-user-123',
            email: 'user@example.com',
            email_verified: true,
            // no name field
          }),
        } as any),
      );

      const result = await service.exchangeCodeForProfile('valid-auth-code');

      expect(result.name).toBe('user');
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      verifyIdTokenSpy.mockImplementation(() =>
        Promise.resolve({
          getPayload: () => ({
            sub: 'google-user-123',
            email: 'user@example.com',
            email_verified: false,
            name: 'John Doe',
          }),
        } as any),
      );

      await expect(
        service.exchangeCodeForProfile('valid-auth-code'),
      ).rejects.toThrow(
        new UnauthorizedException('Google token verification failed'),
      );
    });
  });
});
