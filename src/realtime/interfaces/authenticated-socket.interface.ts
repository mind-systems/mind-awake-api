import { Socket } from 'socket.io';

export type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { userId: string }
>;
