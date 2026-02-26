import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtBlacklist } from '../entities/jwt-blacklist.entity';

@Injectable()
export class JwtBlacklistService {
  constructor(
    @InjectRepository(JwtBlacklist)
    private readonly repo: Repository<JwtBlacklist>,
  ) {}

  async add(token: string, expiresIn: number): Promise<void> {
    if (expiresIn <= 0) return;

    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const entry = this.repo.create({ token, expires_at: expiresAt });
    await this.repo.save(entry);
  }

  async isRevoked(token: string): Promise<boolean> {
    const entry = await this.repo.findOne({ where: { token } });
    if (!entry) return false;

    if (Number(entry.expires_at) < Math.floor(Date.now() / 1000)) {
      await this.repo.delete({ token });
      return false;
    }

    return true;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpired(): Promise<void> {
    await this.repo.delete({
      expires_at: LessThan(Math.floor(Date.now() / 1000)),
    });
  }
}
