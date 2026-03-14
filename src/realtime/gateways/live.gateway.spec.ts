import { LiveGateway } from './live.gateway';
import { StateStore } from '../state-store';
import { PresenceService } from '../services/presence.service';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

function makeSocket(
  userId: string | undefined,
  id: string,
): AuthenticatedSocket {
  return {
    id,
    data: { userId: userId as string },
    disconnect: jest.fn(),
  } as unknown as AuthenticatedSocket;
}

describe('LiveGateway — single-connection policy', () => {
  let gateway: LiveGateway;
  let stateStore: StateStore;
  let presenceService: jest.Mocked<PresenceService>;

  beforeEach(() => {
    stateStore = new StateStore();
    presenceService = {
      online: jest.fn(),
      background: jest.fn(),
      foreground: jest.fn(),
      offline: jest.fn(),
    } as unknown as jest.Mocked<PresenceService>;

    gateway = new LiveGateway(stateStore, presenceService);
  });

  it('first connection — registers socket and calls presenceService.online()', () => {
    const client = makeSocket('user-1', 'socket-1');

    gateway.handleConnection(client);

    expect(stateStore.socketMap.get('user-1')).toBe(client);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(presenceService.online).toHaveBeenCalledWith('user-1', 'socket-1');
  });

  it('second connection same userId — evicts existing socket and registers new one', () => {
    const first = makeSocket('user-1', 'socket-1');
    const second = makeSocket('user-1', 'socket-2');

    gateway.handleConnection(first);
    gateway.handleConnection(second);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(first.disconnect).toHaveBeenCalledWith(true);
    expect(stateStore.socketMap.get('user-1')).toBe(second);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(presenceService.online).toHaveBeenCalledTimes(2);
  });

  it('handleDisconnect matching socketId — clears socketMap and calls presenceService.offline()', () => {
    const client = makeSocket('user-1', 'socket-1');
    gateway.handleConnection(client);

    gateway.handleDisconnect(client);

    expect(stateStore.socketMap.has('user-1')).toBe(false);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(presenceService.offline).toHaveBeenCalledWith('user-1');
  });

  it('handleDisconnect non-matching socketId (evicted socket) — does NOT clear socketMap, does NOT call offline()', () => {
    const evicted = makeSocket('user-1', 'socket-1');
    const current = makeSocket('user-1', 'socket-2');

    gateway.handleConnection(evicted);
    gateway.handleConnection(current);

    // evicted socket fires disconnect after being kicked
    presenceService.offline.mockClear();
    gateway.handleDisconnect(evicted);

    expect(stateStore.socketMap.get('user-1')).toBe(current);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(presenceService.offline).not.toHaveBeenCalled();
  });

  it('handleDisconnect no userId — does not crash', () => {
    const client = makeSocket(undefined, 'socket-x');
    expect(() => gateway.handleDisconnect(client)).not.toThrow();
  });

  describe('presence event handlers', () => {
    it('handleBackground — calls presenceService.background() with correct userId', () => {
      const client = makeSocket('user-1', 'socket-1');
      gateway.handleBackground(client);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(presenceService.background).toHaveBeenCalledWith('user-1');
    });

    it('handleForeground — calls presenceService.foreground() with correct userId', () => {
      const client = makeSocket('user-1', 'socket-1');
      gateway.handleForeground(client);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(presenceService.foreground).toHaveBeenCalledWith('user-1');
    });

    it('handleBackground with no userId — does not crash', () => {
      const client = makeSocket(undefined, 'socket-x');
      expect(() => gateway.handleBackground(client)).not.toThrow();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(presenceService.background).not.toHaveBeenCalled();
    });
  });
});
