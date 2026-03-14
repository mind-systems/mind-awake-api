import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ActivityType } from '../enums/activity-type.enum';

export class ActivityStartDto {
  @IsEnum(ActivityType)
  @IsNotEmpty()
  activityType: ActivityType;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
