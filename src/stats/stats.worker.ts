import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { StatsService } from './stats.service';
import type { SessionEvent } from './stats.service';

@Injectable()
export class StatsWorker {
  private readonly logger = new Logger(StatsWorker.name);

  constructor(private readonly statsService: StatsService) {}

  @OnEvent('session.completed')
  async onSessionCompleted(event: SessionEvent): Promise<void> {
    const durationMs =
      event.endedAt.getTime() - event.startedAt.getTime();
    this.logger.log(
      `Stats finalising: userId=${event.userId} sessionId=${event.sessionId} durationMs=${durationMs}`,
    );
    await this.statsService.finalise(event);
  }

  @OnEvent('session.abandoned')
  async onSessionAbandoned(event: SessionEvent): Promise<void> {
    const durationMs =
      event.endedAt.getTime() - event.startedAt.getTime();
    this.logger.log(
      `Stats finalising: userId=${event.userId} sessionId=${event.sessionId} durationMs=${durationMs}`,
    );
    await this.statsService.finalise(event);
  }
}
