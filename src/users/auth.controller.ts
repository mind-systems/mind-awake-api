import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './service/auth.service';
import { UserResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { FirebaseAuthGuard } from '../firebase/firebase-guard/firebase-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';
import type { RequestWithUser } from './interfaces/auth.interface';

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
    res.setHeader('Authorization', `Bearer ${authResponse.accessToken}`);
    return authResponse.user;
  }

  /**
   * Логаут по JWT
   * POST /auth/logout
   */
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: RequestWithUser) {
    await this.authService.logout(req);
    return { message: 'Logout successful.' };
  }
}
