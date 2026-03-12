import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, RequestWithUser } from '../interfaces/auth.interface';
import { JwtBlacklistService } from '../service/jwt-blacklist.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly blacklistService: JwtBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      return true;
    }

    const isRevoked = await this.blacklistService.isRevoked(token);
    if (isRevoked) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload as JwtPayload;
    } catch {
      // Invalid token — treat as anonymous
    }

    return true;
  }

  private extractToken(request: RequestWithUser): string | undefined {
    const authHeader = request.headers?.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return undefined;
  }
}
