import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { WsAuthGuard } from './ws-auth.guard';
import { SessionService } from '../../users/service/session.service';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let sessionService: jest.Mocked<Pick<SessionService, 'isValid'>>;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    sessionService = { isValid: jest.fn() };
    guard = new WsAuthGuard(
      jwtService as any,
      sessionService as any,
    );
  });

  function createContext(token?: string) {
    const client = {
      handshake: { auth: { token } },
      data: {} as Record<string, any>,
    };
    return {
      switchToWs: () => ({ getClient: () => client }),
      client,
    };
  }

  it('returns true and sets userId when JWT and session are valid', async () => {
    const ctx = createContext('valid-token');
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    sessionService.isValid.mockResolvedValue(true);

    const result = await guard.canActivate(ctx as unknown as ExecutionContext);

    expect(result).toBe(true);
    expect(ctx.client.data.userId).toBe('user-1');
    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(sessionService.isValid).toHaveBeenCalledWith('valid-token');
  });

  it('throws WsException when token is missing', async () => {
    const ctx = createContext(undefined);

    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(WsException);
  });

  it('throws WsException when JWT verification fails', async () => {
    const ctx = createContext('bad-token');
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(WsException);
  });

  it('throws WsException when session is not valid', async () => {
    const ctx = createContext('expired-session-token');
    jwtService.verify.mockReturnValue({ sub: 'user-2' });
    sessionService.isValid.mockResolvedValue(false);

    await expect(
      guard.canActivate(ctx as unknown as ExecutionContext),
    ).rejects.toThrow(WsException);
  });
});
