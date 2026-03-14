import { ActivityEngine } from './activity-engine.service';
import { StateStore } from '../state-store';
import { ActivityType } from '../enums/activity-type.enum';
import { SessionStatus } from '../enums/session-status.enum';
import { ActivityStartDto } from '../dto/activity-start.dto';
import { LiveSession } from '../entities/live-session.entity';

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
}

function makeEmitter() {
  return { emit: jest.fn() };
}

function makeSession(overrides: Partial<LiveSession> = {}): LiveSession {
  const now = new Date();
  return {
    id: 'session-1',
    userId: 'user-1',
    activityType: ActivityType.BREATH_SESSION,
    status: SessionStatus.ACTIVE,
    startedAt: now,
    lastActivityAt: now,
    createdAt: now,
    ...overrides,
  } as LiveSession;
}

describe('ActivityEngine', () => {
  let engine: ActivityEngine;
  let stateStore: StateStore;
  let repo: ReturnType<typeof makeRepo>;
  let emitter: ReturnType<typeof makeEmitter>;

  beforeEach(() => {
    stateStore = new StateStore();
    repo = makeRepo();
    emitter = makeEmitter();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    engine = new ActivityEngine(repo as any, stateStore, emitter as any);
  });

  describe('startActivity', () => {
    it('creates LiveSession row, writes ActivityState to activityMap, returns session', async () => {
      const dto: ActivityStartDto = {
        activityType: ActivityType.BREATH_SESSION,
      };
      const session = makeSession();
      repo.create.mockReturnValue(session);
      repo.save.mockResolvedValue(session);

      const result = await engine.startActivity('user-1', dto);

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(session);
      expect(result).toBe(session);
      const state = stateStore.activityMap.get('user-1');
      expect(state).toBeDefined();
      expect(state!.sessionId).toBe('session-1');
      expect(state!.activityType).toBe(ActivityType.BREATH_SESSION);
    });
  });

  describe('endActivity', () => {
    it('status=completed, endedAt set, removed from activityMap, session.completed emitted', async () => {
      const session = makeSession();
      stateStore.activityMap.set('user-1', {
        sessionId: 'session-1',
        activityType: ActivityType.BREATH_SESSION,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
      });
      repo.findOne.mockResolvedValue(session);
      const savedSession = {
        ...session,
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
      };
      repo.save.mockResolvedValue(savedSession);

      const result = await engine.endActivity('user-1');

      expect(result).toBe(savedSession);
      expect(session.status).toBe(SessionStatus.COMPLETED);
      expect(session.endedAt).toBeDefined();
      expect(stateStore.activityMap.has('user-1')).toBe(false);
      expect(emitter.emit).toHaveBeenCalledWith(
        'session.completed',
        expect.objectContaining({
          sessionId: savedSession.id,
          userId: 'user-1',
        }),
      );
    });

    it('returns null and does not call repo.save when no active session', async () => {
      const result = await engine.endActivity('user-1');

      expect(result).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('onDisconnect', () => {
    it('status=disconnected, disconnectedAt set via repo.update, kept in activityMap, no emit', async () => {
      stateStore.activityMap.set('user-1', {
        sessionId: 'session-1',
        activityType: ActivityType.BREATH_SESSION,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      });

      await engine.onDisconnect('user-1');

      expect(repo.update).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          status: SessionStatus.DISCONNECTED,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          disconnectedAt: expect.any(Date),
        }),
      );
      expect(stateStore.activityMap.has('user-1')).toBe(true);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('no-op when no active session', async () => {
      await engine.onDisconnect('user-1');

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('abandonActivity', () => {
    it('status=abandoned, endedAt set, removed from activityMap, session.abandoned emitted', async () => {
      const session = makeSession();
      stateStore.activityMap.set('user-1', {
        sessionId: 'session-1',
        activityType: ActivityType.BREATH_SESSION,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
      });
      repo.findOne.mockResolvedValue(session);
      const savedSession = {
        ...session,
        status: SessionStatus.ABANDONED,
        endedAt: new Date(),
      };
      repo.save.mockResolvedValue(savedSession);

      await engine.abandonActivity('user-1');

      expect(session.status).toBe(SessionStatus.ABANDONED);
      expect(session.endedAt).toBeDefined();
      expect(stateStore.activityMap.has('user-1')).toBe(false);
      expect(emitter.emit).toHaveBeenCalledWith(
        'session.abandoned',
        expect.objectContaining({
          sessionId: savedSession.id,
          userId: 'user-1',
        }),
      );
    });
  });

  describe('getActiveSession', () => {
    it('returns entry from activityMap', () => {
      const state = {
        sessionId: 'session-1',
        activityType: ActivityType.BREATH_SESSION,
        startedAt: new Date(),
        lastActivityAt: new Date(),
      };
      stateStore.activityMap.set('user-1', state);

      expect(engine.getActiveSession('user-1')).toBe(state);
    });

    it('returns undefined when no entry', () => {
      expect(engine.getActiveSession('user-1')).toBeUndefined();
    });
  });
});
