import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeviceService } from './device.service';
import { DevicePingDto } from './dto/device-ping.dto';

@ApiTags('device')
@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('ping')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register or update device on cold start' })
  @ApiResponse({ status: 204, description: 'Device upserted successfully' })
  async ping(@Body() dto: DevicePingDto): Promise<void> {
    await this.deviceService.ping(dto);
  }
}
