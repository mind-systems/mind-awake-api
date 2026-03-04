import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly mailFrom: string;
  private readonly appBaseUrl: string;
  private readonly templateHtml: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);

    this.mailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'noreply@mind-awake.life',
    );
    this.appBaseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'https://mind-awake.life',
    );

    const templatePath = path.join(
      __dirname,
      'templates',
      'auth-code.html',
    );
    this.templateHtml = fs.readFileSync(templatePath, 'utf-8');
    this.logger.debug(`Mail template loaded from ${templatePath}`);
    this.logger.debug(
      `MailService initialized — from=${this.mailFrom}, appBaseUrl=${this.appBaseUrl}`,
    );
  }

  async sendAuthCode(email: string, code: string): Promise<void> {
    const magicLink = `${this.appBaseUrl}/deeplink-auth?code=${code}`;
    const expiresIn = '15';

    const html = this.templateHtml
      .replace('{{magic_link}}', magicLink)
      .replace('{{manual_code}}', code)
      .replace('{{expires_in}}', expiresIn);

    this.logger.debug(
      `Sending auth code email to=${email}, magicLink=${magicLink}`,
    );

    const { data, error } = await this.resend.emails.send({
      from: this.mailFrom,
      to: email,
      subject: 'Your Mind Awake Login Code',
      html,
    });

    if (error) {
      this.logger.error(
        `Failed to send auth code email to=${email}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.debug(
      `Auth code email sent to=${email}, resendId=${data?.id}`,
    );
  }
}
