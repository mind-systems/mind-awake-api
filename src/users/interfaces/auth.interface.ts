import type { Request as ExpressRequest } from 'express';
import type * as admin from 'firebase-admin';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface UserAuthResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface RequestWithUser extends ExpressRequest {
  user?: admin.auth.DecodedIdToken | JwtPayload;
}
