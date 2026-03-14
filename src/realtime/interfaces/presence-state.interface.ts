export interface PresenceState {
  socketId: string;
  status: 'online' | 'background';
  connectedAt: Date;
  lastSeenAt: Date;
}
