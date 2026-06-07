export type IPCMessageType =
  | "shard:connect"
  | "shard:disconnect"
  | "shard:ready"
  | "shard:resumed"
  | "shard:event"
  | "shard:error"
  | "shard:status"
  | "worker:register"
  | "worker:heartbeat"
  | "worker:ready"
  | "coordinator:assign"
  | "coordinator:revoke"
  | "coordinator:identify";

export interface IPCMessage<T = unknown> {
  type: IPCMessageType;
  workerId: string;
  shardId?: number;
  data?: T;
  timestamp: number;
}

export interface ShardRange {
  start: number;
  end: number;
  exclude?: number[];
}

export interface WorkerMetadata {
  workerId: string;
  hostname: string;
  pid: number;
  shardRange?: ShardRange;
  lastHeartbeat: number;
  startedAt: number;
}

export interface WorkerStatus {
  workerId: string;
  hostname: string;
  pid: number;
  shardRange?: ShardRange;
  shardCount: number;
  connectedShards: number;
  lastHeartbeat: number;
  uptime: number;
  alive: boolean;
}

export interface ShardEventMessage {
  event: string;
  data: unknown;
}

export interface ShardStatusMessage {
  status: "connected" | "disconnected" | "resumed" | "error";
  error?: string;
}

export function expandRange(range: ShardRange): number[] {
  const ids: number[] = [];
  const excluded = new Set(range.exclude ?? []);
  for (let i = range.start; i <= range.end; i++) {
    if (!excluded.has(i)) {
      ids.push(i);
    }
  }
  return ids;
}

export function rangeSize(range: ShardRange): number {
  return range.end - range.start + 1 - (range.exclude?.length ?? 0);
}

export function rangeContains(range: ShardRange, shardId: number): boolean {
  if (shardId < range.start || shardId > range.end) return false;
  return !(range.exclude?.includes(shardId) ?? false);
}
