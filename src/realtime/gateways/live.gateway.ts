import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { StateStore } from '../state-store';

// cors: true — mobile-only clients (Flutter) don't enforce CORS.
// Tighten to a specific origin allowlist if a web client is added.
@WebSocketGateway({ namespace: '/live', cors: true })
@UseGuards(WsAuthGuard)
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly stateStore: StateStore) {}

  handleConnection(client: Socket): void {
    const userId = client.data?.userId;

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
    this.logger.log(`Connected: userId=${userId} socketId=${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId;
    if (!userId) return;

    const stored = this.stateStore.socketMap.get(userId);
    if (stored?.id === client.id) {
      this.stateStore.socketMap.delete(userId);
    }

    this.logger.log(`Disconnected: userId=${userId} socketId=${client.id}`);
  }
}
