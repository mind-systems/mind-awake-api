import type { Request as ExpressRequest } from 'express';
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
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
  user?: JwtPayload;
}
