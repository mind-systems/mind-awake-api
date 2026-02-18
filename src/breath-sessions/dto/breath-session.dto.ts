import { IsString, IsBoolean, IsArray, ValidateNested, IsNumber, IsEnum, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BreathStepDto {
  @ApiProperty({ enum: ['inhale', 'exhale', 'hold'] })
  @IsEnum(['inhale', 'exhale', 'hold'])
  type: 'inhale' | 'exhale' | 'hold';

  @ApiProperty({ example: 4000, description: 'Duration in milliseconds' })
  @IsNumber()
  @Min(0)
  duration: number;
}

class BreathExerciseDto {
  @ApiProperty({ type: [BreathStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathStepDto)
  steps: BreathStepDto[];

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(0)
  restDuration: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  repeatCount: number;
}

export class CreateBreathSessionDto {
  @ApiProperty({ example: 'Morning relaxation' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [BreathExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathExerciseDto)
  exercises: BreathExerciseDto[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  shared?: boolean;
}

export class UpdateBreathSessionDto {
  @ApiPropertyOptional({ example: 'Updated relaxation' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [BreathExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathExerciseDto)
  @IsOptional()
  exercises?: BreathExerciseDto[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  shared?: boolean;
}

export class ListQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 20;
}