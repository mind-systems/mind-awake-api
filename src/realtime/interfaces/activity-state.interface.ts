import { ActivityType } from '../enums/activity-type.enum';

export interface ActivityState {
  sessionId: string;
  activityType: ActivityType;
  activityRefType?: string;
  activityRefId?: string;
  startedAt: Date;
  lastActivityAt: Date;
  isPaused: boolean;
}
