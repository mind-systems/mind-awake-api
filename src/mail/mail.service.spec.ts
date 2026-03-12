import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { MailService } from './mail.service';
import { SupportedLocale } from '../config/locales';

jest.mock('fs');
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'msg-1' }, error: null }),
    },
  })),
}));

const EN_TEMPLATE = '<html>en {{magic_link}} {{manual_code}} {{expires_in}}</html>';
const RU_TEMPLATE = '<html>ru {{magic_link}} {{manual_code}} {{expires_in}}</html>';

describe('MailService', () => {
  let service: MailService;
  let resendSendMock: jest.Mock;

  const configValues: Record<string, string> = {
    RESEND_API_KEY: 'test-key',
    MAIL_FROM: 'noreply@test.com',
    APP_BASE_URL: 'https://test.com',
  };

  beforeEach(async () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('auth-code.en.html')) return EN_TEMPLATE;
      if (filePath.endsWith('auth-code.ru.html')) return RU_TEMPLATE;
      throw new Error(`File not found: ${filePath}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => configValues[key] ?? defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    // Access the resend instance's send mock
    const { Resend } = require('resend');
    resendSendMock = Resend.mock.results[Resend.mock.results.length - 1].value.emails.send;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('loads all locale templates at startup', () => {
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('auth-code.en.html'), 'utf-8');
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('auth-code.ru.html'), 'utf-8');
    });

    it('throws if a template file is missing', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const module = Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => configValues[key] ?? defaultVal),
            },
          },
        ],
      });

      await expect(module.compile()).rejects.toThrow('File not found');
    });
  });

  describe('sendAuthCode', () => {
    it('uses English template and subject when locale is "en"', async () => {
      await service.sendAuthCode('user@test.com', '123456', 'en');

      expect(resendSendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Your Mind Awake Login Code',
          html: expect.stringContaining('en '),
        }),
      );
    });

    it('uses Russian template and subject when locale is "ru"', async () => {
      await service.sendAuthCode('user@test.com', '123456', 'ru');

      expect(resendSendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Ваш код входа Mind Awake',
          html: expect.stringContaining('ru '),
        }),
      );
    });

    it('falls back to English template when locale is not provided', async () => {
      await service.sendAuthCode('user@test.com', '123456');

      expect(resendSendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Your Mind Awake Login Code',
          html: expect.stringContaining('en '),
        }),
      );
    });

    it('interpolates magic_link, manual_code, and expires_in into the template', async () => {
      await service.sendAuthCode('user@test.com', '654321', 'en');

      const call = resendSendMock.mock.calls[0][0];
      expect(call.html).toContain('https://test.com/deeplink-auth?code=654321');
      expect(call.html).toContain('654321');
      expect(call.html).toContain('15');
      expect(call.html).not.toContain('{{magic_link}}');
      expect(call.html).not.toContain('{{manual_code}}');
      expect(call.html).not.toContain('{{expires_in}}');
    });

    it('sends email to the correct recipient', async () => {
      await service.sendAuthCode('target@example.com', '000000', 'en');

      expect(resendSendMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'target@example.com' }),
      );
    });

    it('throws when resend returns an error', async () => {
      resendSendMock.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid API key', name: 'validation_error' },
      });

      await expect(service.sendAuthCode('user@test.com', '111111', 'en')).rejects.toThrow(
        'Failed to send email: Invalid API key',
      );
    });
  });
});
