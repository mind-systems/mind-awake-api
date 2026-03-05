import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
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

    await this.checkCooldown(normalizedEmail);

    await this.deleteOldCodes(normalizedEmail);

    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(
      Date.now() + AuthCodeService.CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    const authCode = this.authCodeRepository.create({
      email: normalizedEmail,
      codeHash,
      expiresAt,
    });

    await this.authCodeRepository.save(authCode);
    this.logger.debug(
      `Auth code saved for email=${normalizedEmail}, expiresAt=${expiresAt.toISOString()}`,
    );

    await this.mailService.sendAuthCode(normalizedEmail, code);
    this.logger.debug(`Auth code email sent to=${normalizedEmail}`);
  }

  async verifyCode(code: string): Promise<AuthResponseDto> {
    this.logger.debug('verifyCode called');

    const codeHash = this.hashCode(code);
    this.logger.debug(`Code hashed, looking up auth_codes`);

    return this.dataSource.transaction(async (manager) => {
      const authCode = await manager
        .getRepository(AuthCode)
        .createQueryBuilder('ac')
        .setLock('pessimistic_write')
        .where('ac.codeHash = :codeHash', { codeHash })
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

      let user = await this.userRepository.findOne({
        where: { email: authCode.email },
      });

      if (!user) {
        const emailPrefix = authCode.email.split('@')[0];
        user = new User({
          email: authCode.email,
          name: emailPrefix,
          role: UserRole.USER,
        });
        user = await this.userRepository.save(user);
        this.logger.debug(`New user created, userId=${user.id}, email=${authCode.email}`);
      } else {
        this.logger.debug(`Existing user found, userId=${user.id}`);
      }

      const authResponse = this.authService.generateToken(user);
      this.logger.debug(`Token generated for userId=${user.id}`);

      return authResponse;
    });
  }

  private async checkCooldown(email: string): Promise<void> {
    const cooldownThreshold = new Date(
      Date.now() - AuthCodeService.COOLDOWN_SECONDS * 1000,
    );

    const recentCode = await this.authCodeRepository.findOne({
      where: {
        email,
        createdAt: MoreThan(cooldownThreshold),
      },
      order: { createdAt: 'DESC' },
    });

    if (recentCode) {
      this.logger.debug(
        `Rate limit hit for email=${email}, last code sent at ${recentCode.createdAt.toISOString()}`,
      );
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async deleteOldCodes(email: string): Promise<void> {
    const result = await this.authCodeRepository.delete({ email });
    this.logger.debug(
      `Deleted ${result.affected ?? 0} old codes for email=${email}`,
    );
  }

  private generateCode(): string {
    const code = crypto.randomInt(100_000, 999_999).toString();
    this.logger.debug('Generated new 6-digit auth code');
    return code;
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
