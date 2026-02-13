import { IsString, IsBoolean, IsArray, ValidateNested, IsNumber, IsEnum, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class BreathStepDto {
  @IsEnum(['inhale', 'exhale', 'hold'])
  type: 'inhale' | 'exhale' | 'hold';

  @IsNumber()
  @Min(0)
  duration: number;
}

class BreathExerciseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathStepDto)
  steps: BreathStepDto[];

  @IsNumber()
  @Min(0)
  restDuration: number;

  @IsNumber()
  @Min(1)
  repeatCount: number;
}

export class CreateBreathSessionDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathExerciseDto)
  exercises: BreathExerciseDto[];

  @IsBoolean()
  @IsOptional()
  shared?: boolean;
}

export class UpdateBreathSessionDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreathExerciseDto)
  @IsOptional()
  exercises?: BreathExerciseDto[];

  @IsBoolean()
  @IsOptional()
  shared?: boolean;
}

export class ListQueryDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 20;
}