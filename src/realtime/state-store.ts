import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class StateStore {
  readonly socketMap = new Map<string, Socket>();
  readonly presenceMap = new Map<string, any>();
  readonly activityMap = new Map<string, any>();
  readonly streamBuffers = new Map<string, any>();
}
