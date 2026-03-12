import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BreathSessionSettings } from './entities/breath-session-settings.entity';
import { UpdateBreathSessionSettingsDto } from './dto/breath-session-settings.dto';

@Injectable()
export class BreathSessionSettingsService {
  constructor(
    @InjectRepository(BreathSessionSettings)
    private readonly settingsRepository: Repository<BreathSessionSettings>,
  ) {}

  async upsert(
    userId: string,
    sessionId: string,
    dto: UpdateBreathSessionSettingsDto,
  ): Promise<BreathSessionSettings> {
    await this.settingsRepository.upsert(
      { userId, sessionId, starred: dto.starred },
      { conflictPaths: ['userId', 'sessionId'] },
    );
    return this.settingsRepository.findOne({ where: { userId, sessionId } }) as Promise<BreathSessionSettings>;
  }

  async findByUserAndSessions(
    userId: string,
    sessionIds: string[],
  ): Promise<Map<string, BreathSessionSettings>> {
    if (sessionIds.length === 0) {
      return new Map();
    }

    const settings = await this.settingsRepository.find({
      where: { userId, sessionId: In(sessionIds) },
    });

    const map = new Map<string, BreathSessionSettings>();
    for (const s of settings) {
      map.set(s.sessionId, s);
    }
    return map;
  }
}
