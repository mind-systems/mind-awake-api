import { Injectable } from '@nestjs/common';

interface WindowEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class RateLimiterService {
  private readonly windows = new Map<string, WindowEntry>();

  consume(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  evict(key: string): void {
    this.windows.delete(key);
  }
}
