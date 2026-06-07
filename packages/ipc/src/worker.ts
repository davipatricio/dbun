import { Shard, type ShardOptions, type EncodingMode, type CompressionMode } from "@dbun/ws";
import type { IPCAdapter } from "./adapter.js";
import type { IPCMessage, ShardRange, ShardEventMessage, ShardStatusMessage } from "./types.js";
import { expandRange } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export interface ShardAssignment {
  range: ShardRange;
  totalShards: number;
}

export interface WorkerOptions {
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

export class Worker {
  private adapter: IPCAdapter;
  readonly workerId: string;
  private token: string;
  private intents: number;
  private currentRange: ShardRange | null;
  private totalShards: number;
  private presence?: unknown;
  private encoding?: EncodingMode;
  private compress?: CompressionMode;
  private shards = new Map<number, Shard>();
  private handlers = new Map<string, Set<EventHandler>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: number;
  private started = false;

  constructor(options: WorkerOptions) {
    this.adapter = options.adapter;
    this.workerId = options.workerId;
    this.token = options.token;
    this.intents = options.intents;
    this.currentRange = options.shards ?? null;
    this.totalShards = options.totalShards ?? (this.currentRange ? this.currentRange.end + 1 : 1);
    this.presence = options.presence;
    this.encoding = options.encoding;
    this.compress = options.compress;
    this.heartbeatInterval = options.heartbeatInterval ?? 15_000;
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
        /* ignore handler errors */
      }
    }
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.adapter.connect();

    this.adapter.onMessage((message) => this.handleMessage(message));

    await this.adapter.sendToCoordinator({
      type: "worker:register",
      workerId: this.workerId,
      data: {
        workerId: this.workerId,
        hostname: typeof process !== "undefined" ? (process.env.HOSTNAME ?? "unknown") : "unknown",
        pid: typeof process !== "undefined" ? process.pid : 0,
        shardRange: this.currentRange,
        lastHeartbeat: Date.now(),
        startedAt: Date.now(),
      },
      timestamp: Date.now(),
    });

    if (this.currentRange) {
      await this.connectShards(this.currentRange);
    }

    this.heartbeatTimer = setInterval(() => {
      this.adapter.heartbeat(this.workerId).catch(() => {});
      this.adapter
        .sendToCoordinator({
          type: "worker:heartbeat",
          workerId: this.workerId,
          timestamp: Date.now(),
        })
        .catch(() => {});
    }, this.heartbeatInterval);

    await this.adapter.sendToCoordinator({
      type: "worker:ready",
      workerId: this.workerId,
      timestamp: Date.now(),
    });

    this.emit("debug", `Worker ${this.workerId} started`);
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const shard of this.shards.values()) {
      shard.disconnect();
    }
    this.shards.clear();

    await this.adapter.sendToCoordinator({
      type: "worker:register",
      workerId: this.workerId,
      data: undefined,
      timestamp: Date.now(),
    });

    await this.adapter.disconnect();
    this.emit("debug", `Worker ${this.workerId} stopped`);
  }

  private async handleMessage(message: IPCMessage): Promise<void> {
    if (message.type === "coordinator:assign") {
      const assignment = message.data as ShardAssignment;
      await this.handleAssignment(assignment);
    } else if (message.type === "coordinator:revoke") {
      const range = message.data as ShardRange;
      await this.handleRevocation(range);
    }
  }

  private async handleAssignment(assignment: ShardAssignment): Promise<void> {
    const { range, totalShards } = assignment;
    const oldRange = this.currentRange;
    this.currentRange = range;
    this.totalShards = totalShards;

    if (oldRange) {
      const oldIds = new Set(expandRange(oldRange));
      const newIds = new Set(expandRange(range));

      for (const id of oldIds) {
        if (!newIds.has(id)) {
          const shard = this.shards.get(id);
          if (shard) {
            shard.disconnect();
            this.shards.delete(id);
          }
        }
      }
    }

    await this.connectShards(range);
    this.emit("assigned", range);
  }

  private async handleRevocation(range: ShardRange): Promise<void> {
    const ids = expandRange(range);
    for (const id of ids) {
      const shard = this.shards.get(id);
      if (shard) {
        shard.disconnect();
        this.shards.delete(id);
      }
    }
    this.emit("revoked", range);
  }

  private async connectShards(range: ShardRange): Promise<void> {
    const ids = expandRange(range);
    this.emit("debug", `Connecting ${ids.length} shards (${range.start}-${range.end})`);

    for (const shardId of ids) {
      if (this.shards.has(shardId)) continue;

      const options: ShardOptions = {
        token: this.token,
        intents: this.intents,
        shardId,
        totalShards: this.totalShards,
        presence: this.presence,
        encoding: this.encoding,
        compress: this.compress,
      };

      const shard = new Shard(options);
      this.shards.set(shardId, shard);

      shard.on("ready", () => {
        this.emit("shard:ready", shardId);
        this.adapter
          .sendToCoordinator({
            type: "shard:ready",
            workerId: this.workerId,
            shardId,
            timestamp: Date.now(),
          })
          .catch(() => {});
      });

      shard.on("dispatch", (event: string, data: unknown) => {
        const msg: ShardEventMessage = { event, data };
        this.emit("shard:event", shardId, event, data);
        this.adapter
          .sendToCoordinator({
            type: "shard:event",
            workerId: this.workerId,
            shardId,
            data: msg,
            timestamp: Date.now(),
          })
          .catch(() => {});
      });

      shard.on("error", (error: unknown) => {
        this.emit("shard:error", shardId, error);
        this.adapter
          .sendToCoordinator({
            type: "shard:error",
            workerId: this.workerId,
            shardId,
            data: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          })
          .catch(() => {});
      });

      shard.on("debug", (msg: string) => {
        this.emit("debug", `[Shard ${shardId}] ${msg}`);
      });

      shard.on("close", (code: number, reason: string) => {
        const status: ShardStatusMessage = { status: "disconnected", error: `${code} ${reason}` };
        this.adapter
          .sendToCoordinator({
            type: "shard:status",
            workerId: this.workerId,
            shardId,
            data: status,
            timestamp: Date.now(),
          })
          .catch(() => {});
      });

      await shard.connect();
    }
  }

  getShards(): Map<number, Shard> {
    return new Map(this.shards);
  }

  getShard(id: number): Shard | undefined {
    return this.shards.get(id);
  }

  getCurrentRange(): ShardRange | null {
    return this.currentRange;
  }
}
