import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

/**
 * Guard applied to @SubscribeMessage handlers.
 *
 * WsAuthMiddleware (registered in afterInit) already authenticated the socket
 * and stored userId in client.data before handleConnection fired. This guard
 * simply asserts that the userId is present — it will always be set for
 * legitimate connections, so this is a safety net rather than the auth boundary.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const userId = client.data?.userId;

    if (!userId) {
      this.logger.warn(
        `[WsAuthGuard] userId missing on authenticated socket — socketId=${client.id}`,
      );
      throw new WsException('Unauthorized');
    }

    return true;
  }
}
