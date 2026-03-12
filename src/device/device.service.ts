import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { DevicePingDto } from './dto/device-ping.dto';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {}

  async ping(dto: DevicePingDto): Promise<void> {
    const existing = await this.deviceRepo.findOne({
      where: { installationId: dto.installationId },
    });

    if (existing) {
      await this.deviceRepo.update(existing.id, {
        platform: dto.platform,
        osVersion: dto.osVersion,
        locale: dto.locale,
        timezone: dto.timezone,
        screenWidth: dto.screenWidth,
        screenHeight: dto.screenHeight,
        appVersion: dto.appVersion,
        buildNumber: dto.buildNumber,
        model: dto.model ?? null,
        manufacturer: dto.manufacturer ?? null,
        lastSeenAt: new Date(),
      });
    } else {
      const device = this.deviceRepo.create({
        installationId: dto.installationId,
        platform: dto.platform,
        osVersion: dto.osVersion,
        locale: dto.locale,
        timezone: dto.timezone,
        screenWidth: dto.screenWidth,
        screenHeight: dto.screenHeight,
        appVersion: dto.appVersion,
        buildNumber: dto.buildNumber,
        model: dto.model ?? null,
        manufacturer: dto.manufacturer ?? null,
        lastSeenAt: new Date(),
      });
      await this.deviceRepo.save(device);
      this.logger.log('New device registered');
    }
  }
}
