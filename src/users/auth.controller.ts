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
import { AuthCodeService } from './service/auth-code.service';
import { UserResponseDto } from './dto/auth-response.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';
import type { RequestWithUser } from './interfaces/auth.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCodeService: AuthCodeService,
  ) {}

  @ApiOperation({ summary: 'Send authentication code to email' })
  @ApiResponse({ status: 200, description: 'If this email is registered, a code has been sent.' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() sendCodeDto: SendCodeDto) {
    await this.authCodeService.sendCode(sendCodeDto.email);
    return { message: 'If this email is registered, a code has been sent.' };
  }

  @ApiOperation({ summary: 'Verify authentication code and get JWT' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body() verifyCodeDto: VerifyCodeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const authResponse = await this.authCodeService.verifyCode(
      verifyCodeDto.email,
      verifyCodeDto.code,
    );
    res.setHeader('Authorization', `Bearer ${authResponse.accessToken}`);
    return authResponse.user;
  }

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
