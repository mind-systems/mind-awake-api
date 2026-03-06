import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { AuthCode } from '../entities/auth-code.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../interfaces/user-role.enum';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { MailService } from '../../mail/mail.service';
import { AuthService } from './auth.service';

@Injectable()
export class AuthCodeService {
  private readonly logger = new Logger(AuthCodeService.name);

  private static readonly CODE_EXPIRY_MINUTES = 15;
  private static readonly COOLDOWN_SECONDS = 60;

  constructor(
    @InjectRepository(AuthCode)
    private readonly authCodeRepository: Repository<AuthCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async sendCode(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    this.logger.debug(`sendCode called for email=${normalizedEmail}`);

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(
      Date.now() + AuthCodeService.CODE_EXPIRY_MINUTES * 60 * 1000,
    );

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
        this.logger.debug(
          `Rate limit hit for email=${normalizedEmail}, last code sent at ${recentCode.createdAt.toISOString()}`,
        );
        throw new HttpException(
          'Too Many Requests',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await authCodeRepo.delete({ email: normalizedEmail });
      this.logger.debug(`Deleted old codes for email=${normalizedEmail}`);

      const authCode = authCodeRepo.create({
        email: normalizedEmail,
        codeHash,
        expiresAt,
      });

      const saved = await authCodeRepo.save(authCode);
      this.logger.debug(
        `Auth code saved for email=${normalizedEmail}, expiresAt=${expiresAt.toISOString()}`,
      );
      return saved;
    });

    try {
      await this.mailService.sendAuthCode(normalizedEmail, code);
      this.logger.debug(`Auth code email sent to=${normalizedEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send auth code email to=${normalizedEmail}, cleaning up saved code id=${savedCode.id}`,
      );
      await this.authCodeRepository.delete({ id: savedCode.id });
      throw error;
    }
  }

  async verifyCode(email: string, code: string): Promise<AuthResponseDto> {
    const normalizedEmail = email.toLowerCase();
    this.logger.debug(`verifyCode called for email=${normalizedEmail}`);

    const codeHash = this.hashCode(code);
    this.logger.debug(`Code hashed, looking up auth_codes for email=${normalizedEmail}`);

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
        this.logger.debug('No valid auth code found — invalid or expired');
        throw new UnauthorizedException('Invalid or expired code');
      }

      this.logger.debug(
        `Valid auth code found, id=${authCode.id}, email=${authCode.email}`,
      );

      authCode.used = true;
      await manager.save(authCode);
      this.logger.debug(`Auth code marked as used, id=${authCode.id}`);

      const userRepo = manager.getRepository(User);
      let user = await userRepo.findOne({
        where: { email: authCode.email },
      });

      if (!user) {
        const emailPrefix = authCode.email.split('@')[0];
        user = new User({
          email: authCode.email,
          name: emailPrefix,
          role: UserRole.USER,
        });
        user = await userRepo.save(user);
        this.logger.debug(`New user created, userId=${user.id}, email=${authCode.email}`);
      } else {
        this.logger.debug(`Existing user found, userId=${user.id}`);
      }

      const authResponse = this.authService.generateToken(user);
      this.logger.debug(`Token generated for userId=${user.id}`);

      return authResponse;
    });
  }

  private generateCode(): string {
    const code = crypto.randomInt(100_000, 1_000_000).toString();
    this.logger.debug('Generated new 6-digit auth code');
    return code;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredCodes(): Promise<void> {
    this.logger.debug('cleanupExpiredCodes — cron triggered');

    const result = await this.authCodeRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.debug(
      `cleanupExpiredCodes — deleted ${result.affected ?? 0} expired auth codes`,
    );
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
