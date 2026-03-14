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
import { StreamEngine } from './services/stream-engine.service';
import { TelemetryGateway } from './gateways/telemetry.gateway';
import { LiveSession } from './entities/live-session.entity';
import { SessionStreamSample } from './entities/session-stream-sample.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([LiveSession, SessionStreamSample]),
  ],
  providers: [
    StateStore,
    WsAuthGuard,
    LiveGateway,
    TelemetryGateway,
    PresenceService,
    ActivityEngine,
    GraceTimerManager,
    StartupRecoveryService,
    StreamEngine,
  ],
  exports: [StateStore, PresenceService],
})
export class RealtimeModule {}
