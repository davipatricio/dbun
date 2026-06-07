import { RedisClient } from "bun";
import type { IPCAdapter, RedisAdapterOptions } from "../adapter.js";
import type { IPCMessage, ShardRange, WorkerMetadata } from "../types.js";

interface StreamEntry {
  id: string;
  fields: string[];
}

export class RedisStreamsAdapter implements IPCAdapter {
  private redis: RedisClient;
  private prefix: string;
  private messageHandlers = new Set<(message: IPCMessage) => void>();
  private consumerGroup: string;
  private consumerName: string;
  private reading = false;
  private isCoordinator: boolean;
  private workerId: string | null;

  constructor(
    options?: RedisAdapterOptions & { consumerName?: string; isCoordinator?: boolean; workerId?: string },
  ) {
    this.prefix = options?.prefix ?? "dbun:ipc:";
    this.consumerGroup = `${this.prefix}group`;
    this.consumerName = options?.consumerName ?? `consumer-${process.pid}`;
    this.isCoordinator = options?.isCoordinator ?? true;
    this.workerId = options?.workerId ?? null;
    const url = options?.url ?? "redis://localhost:6379";
    this.redis = new RedisClient(url);
  }

  private coordStream(): string {
    return `${this.prefix}stream:coordinator`;
  }

  private workerStream(): string {
    return `${this.prefix}stream:workers`;
  }

  private coordConsumerGroup(): string {
    return this.workerId ? `${this.consumerGroup}:coord:${this.workerId}` : `${this.consumerGroup}:coord`;
  }

  private workerConsumerGroup(): string {
    return `${this.consumerGroup}:workers`;
  }

  private workersKey(): string {
    return `${this.prefix}workers`;
  }

  private assignmentKey(): string {
    return `${this.prefix}assignment`;
  }

  async connect(): Promise<void> {
    if (this.isCoordinator) {
      try {
        await this.redis.send("XGROUP", [
          "CREATE",
          this.workerStream(),
          this.workerConsumerGroup(),
          "0",
          "MKSTREAM",
        ]);
      } catch {
        /* group already exists */
      }
    }

    if (this.workerId) {
      try {
        await this.redis.send("XGROUP", [
          "CREATE",
          this.coordStream(),
          this.coordConsumerGroup(),
          "0",
          "MKSTREAM",
        ]);
      } catch {
        /* group already exists */
      }
    }

    this.reading = true;
    this.readLoop();
  }

  async disconnect(): Promise<void> {
    this.reading = false;
    this.messageHandlers.clear();
    this.redis.close();
  }

  private async readLoop(): Promise<void> {
    const stream = this.isCoordinator ? this.workerStream() : this.coordStream();
    const group = this.isCoordinator ? this.workerConsumerGroup() : this.coordConsumerGroup();
    const lastId = this.isCoordinator ? ">" : ">";

    while (this.reading) {
      try {
        const results = (await this.redis.send("XREADGROUP", [
          "GROUP",
          group,
          this.consumerName,
          "COUNT",
          "10",
          "BLOCK",
          "1000",
          "STREAMS",
          stream,
          lastId,
        ])) as [string, StreamEntry[]][] | null;

        if (!results) continue;

        for (const [, entries] of results) {
          for (const entry of entries) {
            const payload = this.fieldsToObject(entry.fields);

            if (!this.isCoordinator && payload.targetWorkerId && payload.targetWorkerId !== this.workerId) {
              await this.redis.send("XACK", [stream, group, entry.id]);
              continue;
            }

            if (payload.message) {
              try {
                const parsed = JSON.parse(payload.message) as IPCMessage;
                for (const handler of this.messageHandlers) {
                  handler(parsed);
                }
              } catch {
                /* ignore malformed */
              }
            }
            await this.redis.send("XACK", [stream, group, entry.id]);
          }
        }
      } catch {
        if (!this.reading) break;
        await Bun.sleep(1000);
      }
    }
  }

  private fieldsToObject(fields: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]!] = fields[i + 1]!;
    }
    return obj;
  }

  async sendToWorker(workerId: string, message: IPCMessage): Promise<void> {
    await this.redis.send("XADD", [
      this.coordStream(),
      "*",
      "targetWorkerId",
      workerId,
      "message",
      JSON.stringify(message),
    ]);
  }

  async sendToCoordinator(message: IPCMessage): Promise<void> {
    await this.redis.send("XADD", [this.workerStream(), "*", "message", JSON.stringify(message)]);
  }

  async broadcast(message: IPCMessage): Promise<void> {
    const workers = await this.getWorkers();
    for (const worker of workers) {
      await this.sendToWorker(worker.workerId, message);
    }
  }

  onMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  async registerWorker(workerId: string, metadata: WorkerMetadata): Promise<void> {
    await this.redis.hset(this.workersKey(), workerId, JSON.stringify(metadata));
  }

  async unregisterWorker(workerId: string): Promise<void> {
    await this.redis.hdel(this.workersKey(), workerId);
    await this.redis.hdel(this.assignmentKey(), workerId);
  }

  async heartbeat(workerId: string): Promise<void> {
    const raw = await this.redis.hget(this.workersKey(), workerId);
    if (raw) {
      const metadata = JSON.parse(raw) as WorkerMetadata;
      metadata.lastHeartbeat = Date.now();
      await this.redis.hset(this.workersKey(), workerId, JSON.stringify(metadata));
    }
  }

  async getWorkers(): Promise<WorkerMetadata[]> {
    const all = await this.redis.hgetall(this.workersKey());
    const workers: WorkerMetadata[] = [];
    for (const raw of Object.values(all)) {
      if (raw) {
        workers.push(JSON.parse(raw) as WorkerMetadata);
      }
    }
    return workers;
  }

  async getShardAssignment(): Promise<Map<string, ShardRange>> {
    const all = await this.redis.hgetall(this.assignmentKey());
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
      await this.redis.hset(this.assignmentKey(), workerId, JSON.stringify(range));
    }
  }
}
