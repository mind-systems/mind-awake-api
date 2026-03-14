import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { WsPayloadSizeGuard } from '../guards/ws-payload-size.guard';
import { StateStore } from '../state-store';
import { PresenceService } from '../services/presence.service';
import { ActivityEngine } from '../services/activity-engine.service';
import {
  ACTIVITY_END,
  ACTIVITY_START,
  PRESENCE_BACKGROUND,
  PRESENCE_FOREGROUND,
  SESSION_STATE,
} from '../events/live.events';
import type { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { ActivityStartDto } from '../dto/activity-start.dto';

// cors: true — mobile-only clients (Flutter) don't enforce CORS.
// Tighten to a specific origin allowlist if a web client is added.
@WebSocketGateway({ namespace: '/live', cors: true })
@UseGuards(WsAuthGuard, WsPayloadSizeGuard)
@UsePipes(new ValidationPipe({ whitelist: true }))
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly stateStore: StateStore,
    private readonly presenceService: PresenceService,
    private readonly activityEngine: ActivityEngine,
  ) {}

  handleConnection(client: Socket): void {
    const socket = client as AuthenticatedSocket;
    const userId = socket.data.userId;

    if (!userId) {
      client.disconnect(true);
      return;
    }

    const existing = this.stateStore.socketMap.get(userId);
    if (existing) {
      this.logger.log(`Evicting previous connection for user ${userId}`);
      existing.disconnect(true);
    }

    this.stateStore.socketMap.set(userId, socket);
    this.presenceService.online(userId, client.id);
    this.logger.log(`Connected: userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const socket = client as AuthenticatedSocket;
    const userId = socket.data.userId;
    if (!userId) return;

    const stored = this.stateStore.socketMap.get(userId);
    if (stored?.id === client.id) {
      this.stateStore.socketMap.delete(userId);
      this.presenceService.offline(userId);
      this.activityEngine.onDisconnect(userId).catch((err: unknown) => {
        this.logger.error(`Failed to record disconnect: userId=${userId}`, err);
      });
    }

    this.logger.log(`Disconnected: userId=${userId} socketId=${client.id}`);
  }

  @SubscribeMessage(ACTIVITY_START)
  async handleActivityStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ActivityStartDto,
  ): Promise<void> {
    const userId = (client as AuthenticatedSocket).data.userId;
    if (!userId) return;

    const existing = this.activityEngine.getActiveSession(userId);
    if (existing) {
      client.emit(SESSION_STATE, {
        sessionId: existing.sessionId,
        status: 'active',
      });
      return;
    }

    const session = await this.activityEngine.startActivity(userId, dto);
    client.emit(SESSION_STATE, { sessionId: session.id, status: 'active' });
    this.logger.log(
      `Activity started: userId=${userId} sessionId=${session.id}`,
    );
  }

  @SubscribeMessage(ACTIVITY_END)
  async handleActivityEnd(@ConnectedSocket() client: Socket): Promise<void> {
    const userId = (client as AuthenticatedSocket).data.userId;
    if (!userId) return;

    const session = await this.activityEngine.endActivity(userId);
    if (!session) return;

    client.emit(SESSION_STATE, { sessionId: session.id, status: 'completed' });
    this.logger.log(`Activity ended: userId=${userId} sessionId=${session.id}`);
  }

  // Fire-and-forget — no ack returned. Clients treat presence events as best-effort.
  @SubscribeMessage(PRESENCE_BACKGROUND)
  handleBackground(@ConnectedSocket() client: Socket): void {
    const userId = (client as AuthenticatedSocket).data.userId;
    if (!userId) return;
    this.presenceService.background(userId);
    this.logger.log(`Background: userId=${userId}`);
  }

  @SubscribeMessage(PRESENCE_FOREGROUND)
  handleForeground(@ConnectedSocket() client: Socket): void {
    const userId = (client as AuthenticatedSocket).data.userId;
    if (!userId) return;
    this.presenceService.foreground(userId);
    this.logger.log(`Foreground: userId=${userId}`);
  }
}
