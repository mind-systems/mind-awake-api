import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../users/interfaces/auth.interface';
import { StatsService } from './stats.service';
import { UserStatsResponseDto } from './dto/user-stats-response.dto';

@ApiTags('users')
@Controller('users/me')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get aggregated stats for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User stats',
    type: UserStatsResponseDto,
  })
  @Get('stats')
  async getStats(
    @CurrentUser() user: JwtPayload,
  ): Promise<UserStatsResponseDto> {
    return this.statsService.getStats(user.sub);
  }
}
