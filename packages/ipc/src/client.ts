import type { IPCAdapter } from "./adapter.js";
import type { ShardRange } from "./types.js";
import { Coordinator } from "./coordinator.js";
import { Worker } from "./worker.js";
import type { AssignmentStrategy } from "./strategies.js";
import type { EncodingMode, CompressionMode } from "@dbun/ws";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export interface GatewayManagerCoordinatorOptions {
  mode: "coordinator";
  adapter: IPCAdapter;
  token: string;
  totalShards?: number | "auto";
  assignment?: "auto" | Record<string, ShardRange> | AssignmentStrategy;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  maxConcurrency?: number;
}

export interface GatewayManagerWorkerOptions {
  mode: "worker";
  adapter: IPCAdapter;
  workerId: string;
  token: string;
  intents: number;
  shards?: ShardRange;
  totalShards?: number;
  presence?: unknown;
  encoding?: EncodingMode;
  compress?: CompressionMode;
  heartbeatInterval?: number;
}

export type GatewayManagerOptions = GatewayManagerCoordinatorOptions | GatewayManagerWorkerOptions;

export class GatewayManager {
  private coordinator: Coordinator | null = null;
  private worker: Worker | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private options: GatewayManagerOptions;

  constructor(options: GatewayManagerOptions) {
    this.options = options;
  }

  on(event: string, handler: EventHandler): this {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch {
        /* ignore */
      }
    }
  }

  async start(): Promise<void> {
    if (this.options.mode === "coordinator") {
      this.coordinator = new Coordinator({
        adapter: this.options.adapter,
        token: this.options.token,
        totalShards: this.options.totalShards,
        assignment: this.options.assignment,
        healthCheckInterval: this.options.healthCheckInterval,
        healthCheckTimeout: this.options.healthCheckTimeout,
        maxConcurrency: this.options.maxConcurrency,
      });

      this.coordinator.on("worker:join", (workerId: string) => {
        this.emit("worker:join", workerId);
      });

      this.coordinator.on("worker:leave", (workerId: string) => {
        this.emit("worker:leave", workerId);
      });

      this.coordinator.on("shard:ready", (shardId: number, workerId: string) => {
        this.emit("shard:ready", shardId, workerId);
      });

      this.coordinator.on("shard:event", (shardId: number, event: string, data: unknown) => {
        this.emit("shard:event", shardId, event, data);
      });

      this.coordinator.on("shard:error", (shardId: number, error: unknown) => {
        this.emit("shard:error", shardId, error);
      });

      this.coordinator.on("debug", (msg: string) => {
        this.emit("debug", msg);
      });

      await this.coordinator.start();
    } else {
      this.worker = new Worker({
        adapter: this.options.adapter,
        workerId: this.options.workerId,
        token: this.options.token,
        intents: this.options.intents,
        shards: this.options.shards,
        totalShards: this.options.totalShards,
        presence: this.options.presence,
        encoding: this.options.encoding,
        compress: this.options.compress,
        heartbeatInterval: this.options.heartbeatInterval,
      });

      this.worker.on("assigned", (range: ShardRange) => {
        this.emit("assigned", range);
      });

      this.worker.on("revoked", (range: ShardRange) => {
        this.emit("revoked", range);
      });

      this.worker.on("shard:ready", (shardId: number) => {
        this.emit("shard:ready", shardId);
      });

      this.worker.on("shard:event", (shardId: number, event: string, data: unknown) => {
        this.emit("shard:event", shardId, event, data);
      });

      this.worker.on("shard:error", (shardId: number, error: unknown) => {
        this.emit("shard:error", shardId, error);
      });

      this.worker.on("debug", (msg: string) => {
        this.emit("debug", msg);
      });

      await this.worker.start();
    }
  }

  async stop(): Promise<void> {
    if (this.coordinator) {
      await this.coordinator.stop();
      this.coordinator = null;
    }
    if (this.worker) {
      await this.worker.stop();
      this.worker = null;
    }
  }

  getCoordinator(): Coordinator | null {
    return this.coordinator;
  }

  getWorker(): Worker | null {
    return this.worker;
  }
}
