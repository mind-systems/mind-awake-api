import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStats } from './entities/user-stats.entity';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';

export interface SessionEvent {
  sessionId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(UserStats)
    private readonly repo: Repository<UserStats>,
  ) {}

  async finalise(event: SessionEvent): Promise<void> {
    const durationSeconds = Math.floor(
      (event.endedAt.getTime() - event.startedAt.getTime()) / 1000,
    );

    const minDuration = parseInt(
      process.env.WS_MIN_SESSION_DURATION_S ?? '10',
      10,
    );

    if (durationSeconds < minDuration) {
      this.logger.log(
        `Stats skipped: userId=${event.userId} sessionId=${event.sessionId} durationSeconds=${durationSeconds} (below min ${minDuration}s)`,
      );
      return;
    }

    const todayUtc = this.todayUtc();

    await this.repo.manager.transaction(async (manager) => {
      // Ensure the row exists atomically — second concurrent caller's INSERT is
      // a no-op due to orIgnore(), then it waits on the pessimistic lock below.
      await manager
        .createQueryBuilder()
        .insert()
        .into(UserStats)
        .values({
          userId: event.userId,
          totalSessions: 0,
          totalDurationSeconds: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastSessionDate: null,
        })
        .orIgnore()
        .execute();

      const row = await manager.findOne(UserStats, {
        where: { userId: event.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!row) return; // should never happen after the insert above

      // Streak logic
      if (row.lastSessionDate === null) {
        row.currentStreak = 1;
      } else if (row.lastSessionDate === todayUtc) {
        // Same day — streak unchanged
      } else if (row.lastSessionDate === this.yesterdayUtc()) {
        row.currentStreak += 1;
      } else {
        // Gap > 1 day — streak broken
        row.currentStreak = 1;
      }

      row.longestStreak = Math.max(row.currentStreak, row.longestStreak);
      row.lastSessionDate = todayUtc;
      row.totalSessions += 1;
      row.totalDurationSeconds += durationSeconds;

      await manager.save(UserStats, row);
    });

    this.logger.log(
      `Stats finalised: userId=${event.userId} sessionId=${event.sessionId} durationSeconds=${durationSeconds}`,
    );
  }

  async getStats(userId: string): Promise<UserStatsResponseDto> {
    const row = await this.repo.findOne({ where: { userId } });

    if (!row) {
      return {
        totalSessions: 0,
        totalDurationSeconds: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastSessionDate: null,
      };
    }

    return {
      totalSessions: row.totalSessions,
      totalDurationSeconds: row.totalDurationSeconds,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      lastSessionDate: row.lastSessionDate,
    };
  }

  private todayUtc(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private yesterdayUtc(): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
