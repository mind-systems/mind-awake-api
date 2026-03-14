import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new RateLimiterService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(service.consume('key1', 5, 1000)).toBe(true);
    }
  });

  it('rejects the request above the limit', () => {
    for (let i = 0; i < 5; i++) {
      service.consume('key1', 5, 1000);
    }
    expect(service.consume('key1', 5, 1000)).toBe(false);
  });

  it('resets the counter after the window expires', () => {
    service.consume('key1', 1, 1000);
    expect(service.consume('key1', 1, 1000)).toBe(false);

    jest.advanceTimersByTime(1001);
    expect(service.consume('key1', 1, 1000)).toBe(true);
  });

  it('evict clears the key', () => {
    service.consume('key1', 1, 1000);
    expect(service.consume('key1', 1, 1000)).toBe(false);

    service.evict('key1');
    expect(service.consume('key1', 1, 1000)).toBe(true);
  });
});
