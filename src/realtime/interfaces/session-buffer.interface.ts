export interface TelemetrySample extends Record<string, unknown> {
  timestamp: number;
  data: unknown;
}

export interface SessionBuffer {
  sessionId: string;
  samples: TelemetrySample[];
  byteSize: number;
  totalReceived: number;
}
