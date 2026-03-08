import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Server authorization code from Google Sign-In SDK' })
  @IsString()
  @IsNotEmpty()
  serverAuthCode: string;

  @ApiPropertyOptional({ example: 'ru', description: 'Raw device locale (used only on first registration)' })
  @IsString()
  @IsOptional()
  language?: string;
}
