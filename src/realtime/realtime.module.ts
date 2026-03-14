import { Module } from '@nestjs/common';
import { AuthModule } from '../users/auth.module';
import { StateStore } from './state-store';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { LiveGateway } from './gateways/live.gateway';

@Module({
  imports: [AuthModule],
  providers: [StateStore, WsAuthGuard, LiveGateway],
  exports: [StateStore],
})
export class RealtimeModule {}
