export interface TelemetrySample {
  timestamp: number;
  data: unknown;
}

export interface SessionBuffer {
  sessionId: string;
  samples: TelemetrySample[];
  byteSize: number;
  totalReceived: number;
}
