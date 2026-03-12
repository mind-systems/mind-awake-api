import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BreathSessionsService } from './breath-sessions.service';
import { CreateBreathSessionDto, UpdateBreathSessionDto, ReplaceBreathSessionDto, ListQueryDto, BreathSessionListResponseDto } from './dto/breath-session.dto';
import { BreathSession } from './entities/breath-session.entity';
import { JwtAuthGuard } from 'src/users/guards/jwt-auth.guard';

@ApiTags('breath_sessions')
@Controller('breath_sessions')
export class BreathSessionsController {
  constructor(private readonly breathSessionsService: BreathSessionsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new breath session' })
  @ApiResponse({ status: 201, description: 'Created successfully', type: BreathSession })
  @Post()
  async create(@Request() req, @Body() createDto: CreateBreathSessionDto) {
    const userId = req.user.sub;
    return this.breathSessionsService.create(userId, createDto);
  }

  @ApiOperation({ summary: 'Get list of breath sessions (own + public for authenticated, public-only for anonymous)' })
  @ApiResponse({ status: 200, description: 'List of sessions', type: BreathSessionListResponseDto })
  @Get('list')
  async findList(@Request() req, @Query() query: ListQueryDto) {
    const userId = req.user?.sub ?? null;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    return this.breathSessionsService.findList(userId, page, pageSize);
  }

  @ApiOperation({ summary: 'Get a specific breath session by ID' })
  @ApiResponse({ status: 200, description: 'Breath session found', type: BreathSession })
  @ApiResponse({ status: 404, description: 'Breath session not found' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.breathSessionsService.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a breath session' })
  @ApiResponse({ status: 200, description: 'Updated successfully', type: BreathSession })
  @ApiResponse({ status: 404, description: 'Breath session not found' })
  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateDto: UpdateBreathSessionDto) {
    const userId = req.user.sub;
    return this.breathSessionsService.update(id, userId, updateDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Replace a breath session (full update)' })
  @ApiResponse({ status: 200, description: 'Replaced successfully', type: BreathSession })
  @ApiResponse({ status: 404, description: 'Breath session not found' })
  @Put(':id')
  async replace(@Request() req, @Param('id') id: string, @Body() replaceDto: ReplaceBreathSessionDto) {
    return this.breathSessionsService.replace(id, req.user.sub, replaceDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a breath session' })
  @ApiResponse({ status: 200, description: 'Deleted successfully' })
  @ApiResponse({ status: 404, description: 'Breath session not found' })
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    await this.breathSessionsService.remove(id, userId);
    return { message: 'Breath session deleted successfully' };
  }
}
