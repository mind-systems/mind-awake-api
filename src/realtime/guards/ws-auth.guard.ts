import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { SessionService } from '../../users/service/session.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token;

    if (!token) {
      throw new WsException('Unauthorized');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new WsException('Unauthorized');
    }

    if (!payload.sub) {
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
