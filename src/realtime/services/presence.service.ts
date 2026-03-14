import { Injectable } from '@nestjs/common';
import { PresenceState } from '../interfaces/presence-state.interface';
import { StateStore } from '../state-store';

@Injectable()
export class PresenceService {
  constructor(private readonly stateStore: StateStore) {}

  online(userId: string, socketId: string): void {
    const now = new Date();
    this.stateStore.presenceMap.set(userId, {
      socketId,
      status: 'online',
      connectedAt: now,
      lastSeenAt: now,
    });
  }

  background(userId: string): void {
    const entry = this.stateStore.presenceMap.get(userId);
    if (!entry) return;
    entry.status = 'background';
    entry.lastSeenAt = new Date();
  }

  foreground(userId: string): void {
    const entry = this.stateStore.presenceMap.get(userId);
    if (!entry) return;
    entry.status = 'online';
    entry.lastSeenAt = new Date();
  }

  offline(userId: string): void {
    this.stateStore.presenceMap.delete(userId);
  }

  get(userId: string): PresenceState | undefined {
    return this.stateStore.presenceMap.get(userId);
  }
}
