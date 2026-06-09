import { EventEmitter } from "node:events";
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export interface AlertEvent {
  type: "alert" | "request_update";
  requestId: string;
  donorId?: string;
  payload: any;
}

export function emitToDonor(donorId: string, event: AlertEvent) {
  bus.emit(`donor:${donorId}`, event);
}

export function emitRequestUpdate(requestId: string, payload: any) {
  bus.emit(`request:${requestId}`, { type: "request_update", requestId, payload });
}

export async function runAlertCycle(requestId: string): Promise<{ alerted: number; radiusKm: number }> {
  return { alerted: 0, radiusKm: 10 };
}

export async function escalateRadius(requestId: string): Promise<number> {
  return 50;
}
