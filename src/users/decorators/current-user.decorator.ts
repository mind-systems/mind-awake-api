import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { RequestWithUser } from '../interfaces/auth.interface';

export const FirebaseUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): admin.auth.DecodedIdToken => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user!;
  },
);
