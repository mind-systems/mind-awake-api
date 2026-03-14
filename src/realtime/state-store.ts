import { Injectable } from '@nestjs/common';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { PresenceState } from './interfaces/presence-state.interface';

@Injectable()
export class StateStore {
  readonly socketMap = new Map<string, AuthenticatedSocket>();
  readonly presenceMap = new Map<string, PresenceState>();
  readonly activityMap = new Map<string, any>();
  readonly streamBuffers = new Map<string, any>();
}
