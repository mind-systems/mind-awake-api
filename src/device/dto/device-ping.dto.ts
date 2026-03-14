import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DevicePingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsString()
  installationId: string;

  @ApiProperty({
    example: 'ios',
    description: 'Platform identifier (e.g. ios, android)',
  })
  @IsString()
  platform: string;

  @ApiProperty({ example: '17.4' })
  @IsString()
  osVersion: string;

  @ApiProperty({ example: 'en_US' })
  @IsString()
  locale: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: 390 })
  @IsInt()
  @Min(0)
  screenWidth: number;

  @ApiProperty({ example: 844 })
  @IsInt()
  @Min(0)
  screenHeight: number;

  @ApiProperty({ example: '1.2.3' })
  @IsString()
  appVersion: string;

  @ApiProperty({ example: '42' })
  @IsString()
  buildNumber: string;

  @ApiPropertyOptional({ example: 'iPhone 15 Pro' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Apple' })
  @IsOptional()
  @IsString()
  manufacturer?: string;
}
