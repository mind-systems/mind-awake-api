import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { UserAuthResponse } from './interfaceis/auth-interfaceis';
import { FirebaseAuthGuard } from '../firebase/firebase-guard/firebase-auth.guard';
import { RegisterDto } from './dto/register-user.dto';
import type { Response } from 'express';
import { FirebaseUser } from './decorators/current-user.decorator';
import type * as admin from 'firebase-admin';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Регистрация нового пользователя
   * POST /auth/register
   */
  @Post('register')
  @UseGuards(FirebaseAuthGuard)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserAuthResponse> {
    const authResponse = await this.authService.register(registerDto);
    res.setHeader('Authorization', `Bearer ${authResponse.access_token}`);
    return authResponse.user;
  }

  @Post('register2')
  async register2(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserAuthResponse> {
    const authResponse = await this.authService.register(registerDto);
    res.setHeader('Authorization', `Bearer ${authResponse.access_token}`);
    return authResponse.user;
  }

  /**
   * Вход пользователя
   * POST /auth/login
   */
  @Post('login')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @FirebaseUser() user: admin.auth.DecodedIdToken,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserAuthResponse> {
    const authResponse = await this.authService.login(user);
    res.setHeader('Authorization', `Bearer ${authResponse.access_token}`);
    return authResponse.user;
  }

  /**
   * Выход пользователя
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@FirebaseUser() user: admin.auth.DecodedIdToken) {
    await this.authService.logout(user.uid);
    return {
      message: 'Logout successful.',
    };
  }
}
