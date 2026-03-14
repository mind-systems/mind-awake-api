import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../users/auth.module';
import { StateStore } from './state-store';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { LiveGateway } from './gateways/live.gateway';
import { PresenceService } from './services/presence.service';
import { ActivityEngine } from './services/activity-engine.service';
import { GraceTimerManager } from './services/grace-timer.service';
import { StartupRecoveryService } from './services/startup-recovery.service';
import { LiveSession } from './entities/live-session.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([LiveSession])],
  providers: [
    StateStore,
    WsAuthGuard,
    LiveGateway,
    PresenceService,
    ActivityEngine,
    GraceTimerManager,
    StartupRecoveryService,
  ],
  exports: [StateStore, PresenceService],
})
export class RealtimeModule {}
