import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ActivityType } from '../enums/activity-type.enum';

export class ActivityEndDto {
  @IsEnum(ActivityType)
  @IsNotEmpty()
  activityType: ActivityType;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
