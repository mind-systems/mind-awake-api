import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import { AuthCode } from '../entities/auth-code.entity';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class AuthCodeService {
  private readonly logger = new Logger(AuthCodeService.name);

  private static readonly CODE_EXPIRY_MINUTES = 15;
  private static readonly COOLDOWN_SECONDS = 60;

  constructor(
    @InjectRepository(AuthCode)
    private readonly authCodeRepository: Repository<AuthCode>,
    private readonly mailService: MailService,
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
