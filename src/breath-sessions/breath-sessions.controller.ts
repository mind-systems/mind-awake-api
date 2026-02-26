import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BreathSessionsService } from './breath-sessions.service';
import { CreateBreathSessionDto, UpdateBreathSessionDto, ListQueryDto } from './dto/breath-session.dto';
import { JwtAuthGuard } from 'src/users/guards/jwt-auth.guard';

@ApiTags('breath_sessions')
@ApiBearerAuth()
@Controller('breath_sessions')
@UseGuards(JwtAuthGuard)
export class BreathSessionsController {
  constructor(private readonly breathSessionsService: BreathSessionsService) {}

  @ApiOperation({ summary: 'Create a new breath session' })
  @Post()
  async create(@Request() req, @Body() createDto: CreateBreathSessionDto) {
    const userId = req.user.sub;
    return this.breathSessionsService.create(userId, createDto);
  }

  @ApiOperation({ summary: 'Get list of own and public breath sessions' })
  @Get('list')
  async findList(@Request() req, @Query() query: ListQueryDto) {
    const userId = req.user.sub;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.breathSessionsService.findList(userId, page, pageSize);
  }

  @ApiOperation({ summary: 'Get a specific breath session by ID' })
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.breathSessionsService.findOne(id, userId);
  }

  @ApiOperation({ summary: 'Update a breath session' })
  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBreathSessionDto) {
    const userId = req.user.sub;
    return this.breathSessionsService.update(id, userId, updateDto);
  }

  @ApiOperation({ summary: 'Delete a breath session' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.breathSessionsService.remove(id, userId);
    return { message: 'Breath session deleted successfully' };
  }
}