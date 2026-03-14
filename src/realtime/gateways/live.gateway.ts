import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { StateStore } from '../state-store';
import { PresenceService } from '../services/presence.service';
import {
  PRESENCE_BACKGROUND,
  PRESENCE_FOREGROUND,
} from '../events/live.events';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

// cors: true — mobile-only clients (Flutter) don't enforce CORS.
// Tighten to a specific origin allowlist if a web client is added.
@WebSocketGateway({ namespace: '/live', cors: true })
@UseGuards(WsAuthGuard)
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly stateStore: StateStore,
    private readonly presenceService: PresenceService,
  ) {}

  handleConnection(client: AuthenticatedSocket): void {
    const userId = client.data.userId;

    if (!userId) {
      client.disconnect(true);
      return;
    }

    const existing = this.stateStore.socketMap.get(userId);
    if (existing) {
      this.logger.log(`Evicting previous connection for user ${userId}`);
      existing.disconnect(true);
    }

    this.stateStore.socketMap.set(userId, client);
    this.presenceService.online(userId, client.id);
    this.logger.log(`Connected: userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data.userId;
    if (!userId) return;

    const stored = this.stateStore.socketMap.get(userId);
    if (stored?.id === client.id) {
      this.stateStore.socketMap.delete(userId);
      this.presenceService.offline(userId);
    }

    this.logger.log(`Disconnected: userId=${userId} socketId=${client.id}`);
  }

  // Fire-and-forget — no ack returned. Clients treat presence events as best-effort.
  @SubscribeMessage(PRESENCE_BACKGROUND)
  handleBackground(client: AuthenticatedSocket): void {
    const userId = client.data.userId;
    if (!userId) return;
    this.presenceService.background(userId);
    this.logger.log(`Background: userId=${userId}`);
  }

  @SubscribeMessage(PRESENCE_FOREGROUND)
  handleForeground(client: AuthenticatedSocket): void {
    const userId = client.data.userId;
    if (!userId) return;
    this.presenceService.foreground(userId);
    this.logger.log(`Foreground: userId=${userId}`);
  }
}
