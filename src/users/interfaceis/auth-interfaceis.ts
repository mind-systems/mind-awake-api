import type { Request as ExpressRequest } from 'express';
import type * as admin from 'firebase-admin';

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export interface UserAuthResponse {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface RequestWithUser extends ExpressRequest {
  user?: admin.auth.DecodedIdToken;
}
