export interface WsEnvelope<T> {
  v: number;
  id: string;
  timestamp: number;
  type: string;
  payload: T;
}
