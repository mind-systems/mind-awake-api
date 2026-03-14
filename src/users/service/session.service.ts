import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { UserSession } from '../entities/user-session.entity';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly repo: Repository<UserSession>,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(token: string, userId: string): Promise<void> {
    const tokenHash = this.hash(token);
    const session = this.repo.create({ userId, tokenHash });
    await this.repo.save(session);
    this.logger.log(`Session created for user ${userId}`);
  }

  async isValid(token: string): Promise<boolean> {
    const tokenHash = this.hash(token);
    const result = await this.repo.update(
      { tokenHash },
      { lastSeenAt: new Date() },
    );
    return (result.affected ?? 0) > 0;
  }

  async revoke(token: string): Promise<void> {
    const tokenHash = this.hash(token);
    const result = await this.repo.delete({ tokenHash });
    if (result.affected) {
      this.logger.log('Session revoked');
    }
  }
}
