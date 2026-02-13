import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BreathSessionsService } from './breath-sessions.service';
import { CreateBreathSessionDto, UpdateBreathSessionDto, ListQueryDto } from './dto/breath-session.dto';
import { JwtAuthGuard } from 'src/users/guards/jwt-auth.guard';


@Controller('breath_sessions')
@UseGuards(JwtAuthGuard)
export class BreathSessionsController {
  constructor(private readonly breathSessionsService: BreathSessionsService) {}

  @Post()
  async create(@Request() req, @Body() createDto: CreateBreathSessionDto) {
    const userId = req.user.id;
    return this.breathSessionsService.create(userId, createDto);
  }

  @Get('list')
  async findList(@Request() req, @Query() query: ListQueryDto) {
    const userId = req.user.id;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.breathSessionsService.findList(userId, page, pageSize);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.breathSessionsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBreathSessionDto) {
    const userId = req.user.id;
    return this.breathSessionsService.update(id, userId, updateDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    await this.breathSessionsService.remove(id, userId);
    return { message: 'Breath session deleted successfully' };
  }
}