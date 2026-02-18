import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { RequestWithUser } from '../../users/interfaces/auth.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Firebase ID token not found');
    }

    try {
      request.user = await this.firebaseAdmin.auth().verifyIdToken(token);
      return true;
    } catch (error: any) {
      console.error('Firebase token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private extractToken(request: RequestWithUser): string | undefined {
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
