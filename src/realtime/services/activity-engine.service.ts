import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveSession } from '../entities/live-session.entity';
import { StateStore } from '../state-store';
import { ActivityState } from '../interfaces/activity-state.interface';
import { ActivityStartDto } from '../dto/activity-start.dto';
import { SessionStatus } from '../enums/session-status.enum';
import { ActivityType } from '../enums/activity-type.enum';

@Injectable()
export class ActivityEngine {
  constructor(
    @InjectRepository(LiveSession)
    private readonly repo: Repository<LiveSession>,
    private readonly stateStore: StateStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startActivity(
    userId: string,
    dto: ActivityStartDto,
  ): Promise<LiveSession> {
    const now = new Date();
    const session = this.repo.create({
      userId,
      activityType: dto.activityType,
      activityRefType: dto.activityRefType,
      activityRefId: dto.activityRefId,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivityAt: now,
    });
    const saved = await this.repo.save(session);

    const state: ActivityState = {
      sessionId: saved.id,
      activityType: saved.activityType,
      activityRefType: saved.activityRefType,
      activityRefId: saved.activityRefId,
      startedAt: saved.startedAt,
      lastActivityAt: saved.lastActivityAt,
    };
    this.stateStore.activityMap.set(userId, state);

    return saved;
  }

  async endActivity(userId: string): Promise<LiveSession | null> {
    const state = this.stateStore.activityMap.get(userId);
    if (!state) return null;

    const now = new Date();
    const session = await this.repo.findOne({ where: { id: state.sessionId } });
    if (!session) {
      this.stateStore.activityMap.delete(userId);
      return null;
    }

    session.status = SessionStatus.COMPLETED;
    session.endedAt = now;
    const saved = await this.repo.save(session);

    this.stateStore.activityMap.delete(userId);

    this.eventEmitter.emit('session.completed', {
      sessionId: saved.id,
      userId,
      startedAt: saved.startedAt,
      endedAt: saved.endedAt,
      activityType: saved.activityType,
    });

    return saved;
  }

  async onDisconnect(userId: string): Promise<void> {
    const state = this.stateStore.activityMap.get(userId);
    if (!state) return;

    const now = new Date();
    await this.repo.update(state.sessionId, {
      status: SessionStatus.DISCONNECTED,
      disconnectedAt: now,
    });
    // Entry stays in activityMap — Phase D handles grace timer + abandon
  }

  async abandonActivity(userId: string): Promise<void> {
    const state = this.stateStore.activityMap.get(userId);
    if (!state) return;

    const now = new Date();
    const session = await this.repo.findOne({ where: { id: state.sessionId } });
    if (!session) {
      this.stateStore.activityMap.delete(userId);
      return;
    }

    session.status = SessionStatus.ABANDONED;
    session.endedAt = now;
    const saved = await this.repo.save(session);

    this.stateStore.activityMap.delete(userId);

    this.eventEmitter.emit('session.abandoned', {
      sessionId: saved.id,
      userId,
      startedAt: saved.startedAt,
      endedAt: saved.endedAt,
      activityType: saved.activityType as ActivityType,
    });
  }

  getActiveSession(userId: string): ActivityState | undefined {
    return this.stateStore.activityMap.get(userId);
  }
}
