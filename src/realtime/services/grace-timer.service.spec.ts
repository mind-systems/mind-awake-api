import { GraceTimerManager } from './grace-timer.service';

function makeConfigService(graceMs?: number) {
  return {
    get: jest.fn().mockReturnValue(graceMs),
  };
}

describe('GraceTimerManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires onExpiry after the configured grace period', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);
    const onExpiry = jest.fn();

    manager.startTimer('user-1', onExpiry);
    expect(onExpiry).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5_000);
    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it('uses default 30 000 ms when config returns undefined', () => {
    const config = makeConfigService(undefined);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);
    const onExpiry = jest.fn();

    manager.startTimer('user-1', onExpiry);
    jest.advanceTimersByTime(29_999);
    expect(onExpiry).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it('cancelTimer prevents onExpiry from firing', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);
    const onExpiry = jest.fn();

    manager.startTimer('user-1', onExpiry);
    manager.cancelTimer('user-1');
    jest.advanceTimersByTime(10_000);

    expect(onExpiry).not.toHaveBeenCalled();
  });

  it('double startTimer cancels the first and starts a fresh one (no duplicate fire)', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);
    const onExpiry = jest.fn();

    manager.startTimer('user-1', onExpiry);
    jest.advanceTimersByTime(2_000);

    // Second call — resets the timer
    manager.startTimer('user-1', onExpiry);
    jest.advanceTimersByTime(4_999);
    expect(onExpiry).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(onExpiry).toHaveBeenCalledTimes(1);
  });

  it('hasPendingTimer returns true while timer is active', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);

    expect(manager.hasPendingTimer('user-1')).toBe(false);
    manager.startTimer('user-1', jest.fn());
    expect(manager.hasPendingTimer('user-1')).toBe(true);
  });

  it('hasPendingTimer returns false after timer fires', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);

    manager.startTimer('user-1', jest.fn());
    jest.advanceTimersByTime(5_000);
    expect(manager.hasPendingTimer('user-1')).toBe(false);
  });

  it('cancelTimer is a no-op when no timer exists', () => {
    const config = makeConfigService(5_000);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const manager = new GraceTimerManager(config as any);

    expect(() => manager.cancelTimer('user-unknown')).not.toThrow();
  });
});
