import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { SUPPORTED_LOCALES } from '../../config/locales';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ivan Ivanov', description: 'Display name' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    enum: SUPPORTED_LOCALES,
    example: 'ru',
    description: 'UI language selection',
  })
  @IsIn(SUPPORTED_LOCALES)
  @IsOptional()
  language?: string;
}
