import { SessionStatus } from '../enums/session-status.enum';

export class SessionStateDto {
  sessionId: string;
  status: SessionStatus;
  timestamp: number;
}
