import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

const MAX_PAYLOAD_BYTES = 65536;

@Injectable()
export class WsPayloadSizeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const wsContext = context.switchToWs();
    const payload: unknown = wsContext.getData();
    let size: number;
    try {
      size = JSON.stringify(payload).length;
    } catch {
      throw new WsException('Payload is not serializable');
    }
    if (size > MAX_PAYLOAD_BYTES) {
      throw new WsException(
        `Payload too large (${size} bytes, max ${MAX_PAYLOAD_BYTES})`,
      );
    }
    return true;
  }
}
