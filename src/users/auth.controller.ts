import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './service/auth.service';
import { UserResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { FirebaseAuthGuard } from '../firebase/firebase-guard/firebase-auth.guard';
import type { Response } from 'express';
import { FirebaseUser } from './decorators/current-user.decorator';
import type * as admin from 'firebase-admin';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Вход пользователя (автоматическая регистрация, если не существует)
   * POST /auth/login
   */
  @ApiOperation({ summary: 'Login or Register with Firebase Token' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiBearerAuth()
  @Post('login')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const authResponse = await this.authService.login(loginDto);
    res.setHeader('Authorization', `Bearer ${authResponse.access_token}`);
    return authResponse.user;
  }

  /**
   * Выход пользователя
   * POST /auth/logout
   */
  @ApiOperation({ summary: 'Revoke Firebase tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBearerAuth()
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
