import { RedisClient } from "bun";
import type { IPCAdapter, RedisAdapterOptions } from "../adapter.js";
import type { IPCMessage, ShardRange, WorkerMetadata } from "../types.js";

export class RedisPubSubAdapter implements IPCAdapter {
  private pub: RedisClient;
  private sub: RedisClient | null = null;
  private prefix: string;
  private messageHandlers = new Set<(message: IPCMessage) => void>();
  private url: string;
  private workerId: string | null = null;

  constructor(options?: RedisAdapterOptions & { workerId?: string }) {
    this.prefix = options?.prefix ?? "dbun:ipc:";
    this.url = options?.url ?? "redis://localhost:6379";
    this.pub = new RedisClient(this.url);
    this.workerId = options?.workerId ?? null;
  }

  private coordChannel(): string {
    return `${this.prefix}coordinator`;
  }

  private broadcastChannel(): string {
    return `${this.prefix}broadcast`;
  }

  private workerChannel(workerId: string): string {
    return `${this.prefix}worker:${workerId}`;
  }

  private workersKey(): string {
    return `${this.prefix}workers`;
  }

  private assignmentKey(): string {
    return `${this.prefix}assignment`;
  }

  async connect(): Promise<void> {
    this.sub = await this.pub.duplicate();

    await this.sub.subscribe(this.coordChannel(), (message: string) => {
      this.dispatch(message);
    });
    await this.sub.subscribe(this.broadcastChannel(), (message: string) => {
      this.dispatch(message);
    });

    if (this.workerId) {
      await this.sub.subscribe(this.workerChannel(this.workerId), (message: string) => {
        this.dispatch(message);
      });
    }
  }

  private dispatch(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as IPCMessage;
      for (const handler of this.messageHandlers) {
        handler(parsed);
      }
    } catch {
      /* ignore malformed messages */
    }
  }

  async disconnect(): Promise<void> {
    if (this.sub) {
      await this.sub.unsubscribe(this.coordChannel());
      await this.sub.unsubscribe(this.broadcastChannel());
      if (this.workerId) {
        await this.sub.unsubscribe(this.workerChannel(this.workerId));
      }
      this.sub.close();
      this.sub = null;
    }
    this.messageHandlers.clear();
    this.pub.close();
  }

  async sendToWorker(workerId: string, message: IPCMessage): Promise<void> {
    await this.pub.publish(this.workerChannel(workerId), JSON.stringify(message));
  }

  async sendToCoordinator(message: IPCMessage): Promise<void> {
    await this.pub.publish(this.coordChannel(), JSON.stringify(message));
  }

  async broadcast(message: IPCMessage): Promise<void> {
    await this.pub.publish(this.broadcastChannel(), JSON.stringify(message));
  }

  onMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  async registerWorker(workerId: string, metadata: WorkerMetadata): Promise<void> {
    await this.pub.hset(this.workersKey(), workerId, JSON.stringify(metadata));
  }

  async unregisterWorker(workerId: string): Promise<void> {
    await this.pub.hdel(this.workersKey(), workerId);
    await this.pub.hdel(this.assignmentKey(), workerId);
  }

  async heartbeat(workerId: string): Promise<void> {
    const raw = await this.pub.hget(this.workersKey(), workerId);
    if (raw) {
      const metadata = JSON.parse(raw) as WorkerMetadata;
      metadata.lastHeartbeat = Date.now();
      await this.pub.hset(this.workersKey(), workerId, JSON.stringify(metadata));
    }
  }

  async getWorkers(): Promise<WorkerMetadata[]> {
    const all = await this.pub.hgetall(this.workersKey());
    const workers: WorkerMetadata[] = [];
    for (const raw of Object.values(all)) {
      if (raw) {
        workers.push(JSON.parse(raw) as WorkerMetadata);
      }
    }
    return workers;
  }

  async getShardAssignment(): Promise<Map<string, ShardRange>> {
    const all = await this.pub.hgetall(this.assignmentKey());
    const assignment = new Map<string, ShardRange>();
    for (const [workerId, raw] of Object.entries(all)) {
      if (raw) {
        assignment.set(workerId, JSON.parse(raw) as ShardRange);
      }
    }
    return assignment;
  }

  async setShardAssignment(assignment: Map<string, ShardRange>): Promise<void> {
    for (const [workerId, range] of assignment) {
      await this.pub.hset(this.assignmentKey(), workerId, JSON.stringify(range));
    }
  }
}
