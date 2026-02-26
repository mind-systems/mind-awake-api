import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestWithUser } from '../interfaces/auth.interface';
import { JwtBlacklistService } from '../service/jwt-blacklist.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly blacklistService: JwtBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('JWT token not found');
    }

    const isRevoked = await this.blacklistService.isRevoked(token);
    if (isRevoked) {
      throw new UnauthorizedException('JWT token revoked');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload as any;
      return true;
    } catch (error: any) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  public extractToken(request: RequestWithUser): string | undefined {
    const authHeader = request.headers?.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    if (request.body && typeof request.body.token === 'string') {
      return request.body.token;
    }

    return undefined;
  }
}
