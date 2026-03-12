import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_LOCALES, SupportedLocale } from '../config/locales';

const LOCALIZED_SUBJECTS: Record<SupportedLocale, string> = {
  en: 'Your Mind Awake Login Code',
  ru: 'Ваш код входа Mind Awake',
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly mailFrom: string;
  private readonly appBaseUrl: string;
  private readonly templates = new Map<SupportedLocale, string>();

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY environment variable is not defined');
    this.resend = new Resend(apiKey);

    this.mailFrom = this.configService.get<string>(
      'MAIL_FROM',
      'noreply@mind-awake.life',
    );
    this.appBaseUrl = this.configService.get<string>(
      'APP_BASE_URL',
      'https://mind-awake.life',
    );

    for (const locale of SUPPORTED_LOCALES) {
      const templatePath = path.join(__dirname, 'templates', `auth-code.${locale}.html`);
      try {
        this.templates.set(locale, fs.readFileSync(templatePath, 'utf-8'));
      } catch (error) {
        this.logger.error(`Failed to load template locale=${locale}: ${error.message}`);
        throw error;
      }
    }
  }

  async sendAuthCode(email: string, code: string, locale: SupportedLocale = 'en'): Promise<void> {
    const templateHtml = this.templates.get(locale) ?? this.templates.get('en');
    if (!templateHtml) {
      throw new Error(`No mail template found for locale=${locale}`);
    }
    const subject = LOCALIZED_SUBJECTS[locale] ?? LOCALIZED_SUBJECTS['en'];

    const magicLink = `${this.appBaseUrl}/deeplink-auth?code=${code}`;
    const expiresIn = '15';

    const html = templateHtml
      .replace('{{magic_link}}', magicLink)
      .replace('{{manual_code}}', code)
      .replace('{{expires_in}}', expiresIn);

    const { data, error } = await this.resend.emails.send({
      from: this.mailFrom,
      to: email,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`sendAuthCode failed locale=${locale}: ${JSON.stringify(error)}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.log(`sendAuthCode: sent locale=${locale} messageId=${data?.id}`);
  }
}
