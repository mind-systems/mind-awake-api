import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreathSession } from './entities/breath-session.entity';
import { CreateBreathSessionDto, UpdateBreathSessionDto } from './dto/breath-session.dto';

@Injectable()
export class BreathSessionsService {
  private readonly logger = new Logger(BreathSessionsService.name);

  constructor(
    @InjectRepository(BreathSession)
    private readonly breathSessionRepository: Repository<BreathSession>,
  ) {}

  async create(userId: string, createDto: CreateBreathSessionDto): Promise<BreathSession> {
    const session = this.breathSessionRepository.create({
      ...createDto,
      userId,
      shared: createDto.shared ?? false,
    });

    return this.breathSessionRepository.save(session);
  }

  async findList(userId: string, page: number, pageSize: number): Promise<{ data: BreathSession[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;

    // Получаем свои сессии
    const [ownSessions, ownTotal] = await this.breathSessionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    // Если свои сессии заполнили всю страницу
    if (ownSessions.length >= pageSize) {
      return {
        data: ownSessions,
        total: ownTotal,
        page,
        pageSize,
      };
    }

    // Вычисляем сколько еще нужно шаред сессий
    const remainingCount = pageSize - ownSessions.length;
    const sharedSkip = Math.max(0, skip - ownTotal);

    // Получаем публичные сессии других пользователей
    const [sharedSessions] = await this.breathSessionRepository.findAndCount({
      where: { shared: true },
      order: { createdAt: 'DESC' },
      skip: sharedSkip,
      take: remainingCount,
    });

    // Фильтруем свои из шаред
    const otherSharedSessions = sharedSessions.filter(s => s.userId !== userId);

    // Подсчитываем общее количество доступных сессий
    const sharedTotal = await this.breathSessionRepository.count({
      where: { shared: true },
    });

    const totalAvailable = ownTotal + sharedTotal;

    return {
      data: [...ownSessions, ...otherSharedSessions],
      total: totalAvailable,
      page,
      pageSize,
    };
  }

  async findOne(id: string, userId: string): Promise<BreathSession> {
    const session = await this.breathSessionRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Breath session not found');
    }

    // Проверяем доступ: владелец или публичная
    if (session.userId !== userId && !session.shared) {
      throw new ForbiddenException('Access denied to this breath session');
    }

    return session;
  }

  async update(id: string, userId: string, updateDto: UpdateBreathSessionDto): Promise<BreathSession> {
    const session = await this.breathSessionRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Breath session not found');
    }

    // Только владелец может обновлять
    if (session.userId !== userId) {
      throw new ForbiddenException('You can only update your own breath sessions');
    }

    Object.assign(session, updateDto);
    return this.breathSessionRepository.save(session);
  }

  async remove(id: string, userId: string): Promise<void> {
    const session = await this.breathSessionRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Breath session not found');
    }

    // Только владелец может удалять
    if (session.userId !== userId) {
      throw new ForbiddenException('You can only delete your own breath sessions');
    }

    await this.breathSessionRepository.remove(session);
  }
}