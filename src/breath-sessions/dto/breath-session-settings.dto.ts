import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBreathSessionSettingsDto {
  @ApiProperty({ example: true, description: 'Whether the session is starred' })
  @IsBoolean()
  starred: boolean;
}

export class BreathSessionSettingsResponseDto {
  @ApiProperty({ example: true })
  starred: boolean;
}
