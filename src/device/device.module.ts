import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule {}
