import type { IPCMessage, ShardRange, WorkerMetadata } from "./types.js";

export interface IPCAdapter {
  sendToWorker(workerId: string, message: IPCMessage): Promise<void>;
  sendToCoordinator(message: IPCMessage): Promise<void>;
  broadcast(message: IPCMessage): Promise<void>;
  onMessage(handler: (message: IPCMessage) => void): void;
  offMessage(handler: (message: IPCMessage) => void): void;
  registerWorker(workerId: string, metadata: WorkerMetadata): Promise<void>;
  unregisterWorker(workerId: string): Promise<void>;
  heartbeat(workerId: string): Promise<void>;
  getWorkers(): Promise<WorkerMetadata[]>;
  getShardAssignment(): Promise<Map<string, ShardRange>>;
  setShardAssignment(assignment: Map<string, ShardRange>): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export interface RedisAdapterOptions {
  url?: string;
  prefix?: string;
}

export interface WorkerThreadsAdapterOptions {
  workerScript: string;
  isCoordinator?: boolean;
}

export async function redisPubSubAdapter(options?: RedisAdapterOptions): Promise<IPCAdapter> {
  const { RedisPubSubAdapter } = await import("./adapters/redis-pubsub.js");
  return new RedisPubSubAdapter(options);
}

export async function redisStreamsAdapter(options?: RedisAdapterOptions): Promise<IPCAdapter> {
  const { RedisStreamsAdapter } = await import("./adapters/redis-streams.js");
  return new RedisStreamsAdapter(options);
}

export async function workerThreadsAdapter(options: WorkerThreadsAdapterOptions): Promise<IPCAdapter> {
  const { WorkerThreadsAdapter } = await import("./adapters/worker-threads.js");
  return new WorkerThreadsAdapter(options);
}
