import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { SessionService } from '../../users/service/session.service';
import type { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

/**
 * Socket.IO middleware — runs before handleConnection on every new socket.
 * Sets client.data.userId on success or calls next(Error) to reject the socket.
 *
 * NestJS guards (@UseGuards) are not invoked during handleConnection, only for
 * @SubscribeMessage handlers. This middleware fills that gap so that by the time
 * handleConnection fires, the socket is already authenticated.
 */
@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  middleware() {
    return async (client: Socket, next: (err?: Error) => void) => {
      const token: unknown = client.handshake?.auth?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(`[WsAuth] No token — socketId=${client.id}`);
        next(new Error('Unauthorized'));
        return;
      }

      let payload: { sub?: unknown };
      try {
        payload = this.jwtService.verify(token);
      } catch (err) {
        this.logger.warn(
          `[WsAuth] JWT verify failed — socketId=${client.id}: ${(err as Error).message}`,
        );
        next(new Error('Unauthorized'));
        return;
      }

      if (!payload.sub || typeof payload.sub !== 'string') {
        this.logger.warn(`[WsAuth] Invalid payload — socketId=${client.id}`);
        next(new Error('Unauthorized'));
        return;
      }

      const isValid = await this.sessionService.isValid(token);
      if (!isValid) {
        this.logger.warn(
          `[WsAuth] Session invalid — userId=${payload.sub} socketId=${client.id}`,
        );
        next(new Error('Unauthorized'));
        return;
      }

      (client as AuthenticatedSocket).data.userId = payload.sub;
      this.logger.log(
        `[WsAuth] OK — userId=${payload.sub} socketId=${client.id}`,
      );
      next();
    };
  }
}
