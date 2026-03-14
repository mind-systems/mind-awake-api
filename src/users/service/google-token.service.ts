import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleProfile } from '../interfaces/google-profile.interface';

@Injectable()
export class GoogleTokenService {
  private readonly logger = new Logger(GoogleTokenService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_CLIENT_SECRET',
    );

    this.client = new OAuth2Client(this.clientId, clientSecret);
  }

  async exchangeCodeForProfile(serverAuthCode: string): Promise<GoogleProfile> {
    let idToken: string;
    try {
      const { tokens } = await this.client.getToken(serverAuthCode);
      if (!tokens.id_token) {
        throw new Error('No id_token in Google token response');
      }
      idToken = tokens.id_token;
    } catch (error) {
      this.logger.warn(`Token exchange failed: ${(error as Error).message}`);
      throw new UnauthorizedException(
        'Invalid or expired Google authorization code',
      );
    }

    let googleId: string;
    let email: string;
    let name: string;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Empty id_token payload');
      }
      if (!payload.email_verified) {
        throw new Error('Google account email is not verified');
      }
      if (!payload.email) {
        throw new Error('Google account has no email');
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name ?? email.split('@')[0];
    } catch (error) {
      this.logger.warn(
        `id_token verification failed: ${(error as Error).message}`,
      );
      throw new UnauthorizedException('Google token verification failed');
    }

    this.logger.log(`Google auth: googleId=${googleId}`);
    return { googleId, email, name };
  }
}
