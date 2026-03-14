export class DataAckDto {
  sessionId: string;
  receivedCount: number;
  maxSamplesPerSecond: number;
  timestamp: number;
}
