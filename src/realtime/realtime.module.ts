import { Module } from '@nestjs/common';
import { AuthModule } from '../users/auth.module';
import { StateStore } from './state-store';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { LiveGateway } from './gateways/live.gateway';
import { PresenceService } from './services/presence.service';

@Module({
  imports: [AuthModule],
  providers: [StateStore, WsAuthGuard, LiveGateway, PresenceService],
  exports: [StateStore, PresenceService],
})
export class RealtimeModule {}
