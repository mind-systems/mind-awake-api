import { Injectable } from '@nestjs/common';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { PresenceState } from './interfaces/presence-state.interface';
import { ActivityState } from './interfaces/activity-state.interface';

@Injectable()
export class StateStore {
  readonly socketMap = new Map<string, AuthenticatedSocket>();
  readonly presenceMap = new Map<string, PresenceState>();
  readonly activityMap = new Map<string, ActivityState>();
  readonly streamBuffers = new Map<string, any>();
}
