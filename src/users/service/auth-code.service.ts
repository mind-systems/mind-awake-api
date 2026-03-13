import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { AuthCode } from '../entities/auth-code.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../interfaces/user-role.enum';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { MailService } from '../../mail/mail.service';
import { AuthService } from './auth.service';
import { resolveLocale } from '../../config/locales';

@Injectable()
export class AuthCodeService {
  private readonly logger = new Logger(AuthCodeService.name);

  private static readonly CODE_EXPIRY_MINUTES = 15;
  private static readonly COOLDOWN_SECONDS = 60;

  constructor(
    @InjectRepository(AuthCode)
    private readonly authCodeRepository: Repository<AuthCode>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async sendCode(email: string, rawLocale?: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(
      Date.now() + AuthCodeService.CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: { email: normalizedEmail },
      select: ['language'],
    });
    const locale = resolveLocale(existingUser?.language ?? rawLocale);

    const savedCode = await this.dataSource.transaction(async (manager) => {
      const authCodeRepo = manager.getRepository(AuthCode);

      const cooldownThreshold = new Date(
        Date.now() - AuthCodeService.COOLDOWN_SECONDS * 1000,
      );
      const recentCode = await authCodeRepo
        .createQueryBuilder('ac')
        .setLock('pessimistic_write')
        .where('ac.email = :email', { email: normalizedEmail })
        .andWhere('ac.createdAt > :cooldownThreshold', { cooldownThreshold })
        .orderBy('ac.createdAt', 'DESC')
        .getOne();

      if (recentCode) {
        this.logger.warn(`sendCode: rate limit hit, codeId=${recentCode.id}`);
        throw new HttpException(
          'Too Many Requests',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await authCodeRepo.delete({ email: normalizedEmail });

      const authCode = authCodeRepo.create({
        email: normalizedEmail,
        codeHash,
        expiresAt,
      });

      return authCodeRepo.save(authCode);
    });

    try {
      await this.mailService.sendAuthCode(normalizedEmail, code, locale);
      this.logger.log(`sendCode: sent codeId=${savedCode.id} locale=${locale}`);
    } catch (error) {
      this.logger.error(`sendCode: mail delivery failed, cleaning up codeId=${savedCode.id}`);
      await this.authCodeRepository.delete({ id: savedCode.id });
      throw error;
    }
  }

  async verifyCode(email: string, code: string, language?: string): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase();
    const codeHash = this.hashCode(code);

    return this.dataSource.transaction(async (manager) => {
      const authCode = await manager
        .getRepository(AuthCode)
        .createQueryBuilder('ac')
        .setLock('pessimistic_write')
        .where('ac.codeHash = :codeHash', { codeHash })
        .andWhere('ac.email = :email', { email: normalizedEmail })
        .andWhere('ac.used = false')
        .andWhere('ac.expiresAt > :now', { now: new Date() })
        .getOne();

      if (!authCode) {
        this.logger.warn(`verifyCode: invalid or expired code`);
        throw new UnauthorizedException('Invalid or expired code');
      }

      authCode.used = true;
      await manager.save(authCode);

      const userRepo = manager.getRepository(User);
      let user = await userRepo.findOne({
        where: { email: authCode.email },
      });

      if (!user) {
        const emailPrefix = authCode.email.split('@')[0];
        const resolvedLanguage = resolveLocale(language);
        user = new User({
          email: authCode.email,
          name: emailPrefix,
          role: UserRole.USER,
          language: resolvedLanguage,
        });
        user = await userRepo.save(user);
        this.logger.log(`verifyCode: new user registered, userId=${user.id}, language=${resolvedLanguage}`);
      }

      return await this.authService.generateToken(user);
    });
  }

  private generateCode(): string {
    return crypto.randomInt(100_000, 1_000_000).toString();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredCodes(): Promise<void> {
    const result = await this.authCodeRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected ?? 0} expired auth codes`);
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
