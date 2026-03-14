import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_GRACE_MS = 30_000;

@Injectable()
export class GraceTimerManager {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly graceMs: number;

  constructor(private readonly configService: ConfigService) {
    this.graceMs =
      this.configService.get<number>('WS_RECONNECT_GRACE_MS') ??
      DEFAULT_GRACE_MS;
  }

  startTimer(userId: string, onExpiry: () => void | Promise<void>): void {
    this.cancelTimer(userId);
    const handle = setTimeout(() => {
      this.timers.delete(userId);
      void onExpiry();
    }, this.graceMs);
    this.timers.set(userId, handle);
  }

  cancelTimer(userId: string): void {
    const handle = this.timers.get(userId);
    if (handle === undefined) return;
    clearTimeout(handle);
    this.timers.delete(userId);
  }

  hasPendingTimer(userId: string): boolean {
    return this.timers.has(userId);
  }
}
