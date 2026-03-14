import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { SessionService } from '../../users/service/session.service';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token: unknown = client.handshake?.auth?.token;

    if (!token || typeof token !== 'string') {
      throw new WsException('Unauthorized');
    }

    let payload: { sub?: unknown };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new WsException('Unauthorized');
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new WsException('Unauthorized');
    }

    const isValid = await this.sessionService.isValid(token);
    if (!isValid) {
      throw new WsException('Unauthorized');
    }

    client.data.userId = payload.sub;
    return true;
  }
}
