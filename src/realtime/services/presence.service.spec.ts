import { PresenceService } from './presence.service';
import { StateStore } from '../state-store';

describe('PresenceService', () => {
  let service: PresenceService;
  let stateStore: StateStore;

  beforeEach(() => {
    stateStore = new StateStore();
    service = new PresenceService(stateStore);
  });

  it('online() — creates entry with status=online and correct socketId', () => {
    service.online('user-1', 'socket-abc');

    const entry = stateStore.presenceMap.get('user-1');
    expect(entry).toBeDefined();
    expect(entry!.status).toBe('online');
    expect(entry!.socketId).toBe('socket-abc');
    expect(entry!.connectedAt).toBeInstanceOf(Date);
    expect(entry!.lastSeenAt).toBeInstanceOf(Date);
  });

  it('background() after online — sets status to background, preserves socketId', () => {
    service.online('user-1', 'socket-abc');
    service.background('user-1');

    const entry = stateStore.presenceMap.get('user-1');
    expect(entry!.status).toBe('background');
    expect(entry!.socketId).toBe('socket-abc');
  });

  it('foreground() after background — sets status back to online', () => {
    service.online('user-1', 'socket-abc');
    service.background('user-1');
    service.foreground('user-1');

    const entry = stateStore.presenceMap.get('user-1');
    expect(entry!.status).toBe('online');
  });

  it('offline() — removes entry from presenceMap', () => {
    service.online('user-1', 'socket-abc');
    service.offline('user-1');

    expect(stateStore.presenceMap.has('user-1')).toBe(false);
  });

  it('background() on unknown userId — does not throw', () => {
    expect(() => service.background('unknown')).not.toThrow();
  });

  it('offline() on unknown userId — does not throw', () => {
    expect(() => service.offline('unknown')).not.toThrow();
  });
});
