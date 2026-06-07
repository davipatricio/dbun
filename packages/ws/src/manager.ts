import type { APIGatewayBotInfo } from "@dbun/types";
import { fetchGatewayInfo } from "./gateway-url.js";
import { Shard, type ShardOptions } from "./shard.js";
import type { EncodingMode } from "./codec.js";
import type { CompressionMode } from "./compression.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export interface ShardManagerOptions {
  token: string;
  intents: number;
  totalShards?: number;
  shardIds?: number[];
  presence?: unknown;
  encoding?: EncodingMode;
  compress?: CompressionMode;
}

export class ShardManager {
  private options: ShardManagerOptions;
  private shards = new Map<number, Shard>();
  private handlers = new Map<string, Set<EventHandler>>();
  private gatewayInfo: APIGatewayBotInfo | null = null;

  constructor(options: ShardManagerOptions) {
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
        /* ignore handler errors */
      }
    }
  }

  async connect(): Promise<void> {
    this.gatewayInfo = await fetchGatewayInfo(this.options.token);
    const totalShards = this.options.totalShards ?? this.gatewayInfo.shards;
    const maxConcurrency = this.gatewayInfo.session_start_limit.max_concurrency;
    const shardIds = this.options.shardIds ?? Array.from({ length: totalShards }, (_, i) => i);

    this.emit(
      "debug",
      `Starting ${shardIds.length} shards (total: ${totalShards}, concurrency: ${maxConcurrency})`,
    );

    for (const id of shardIds) {
      if (id >= totalShards) {
        throw new Error(`Shard ID ${id} exceeds total shards ${totalShards}`);
      }
    }

    const buckets = new Map<number, number[]>();
    for (const id of shardIds) {
      const key = id % maxConcurrency;
      const bucket = buckets.get(key) ?? [];
      bucket.push(id);
      buckets.set(key, bucket);
    }

    const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);

    for (const key of sortedKeys) {
      const bucket = buckets.get(key)!;
      this.emit("debug", `Starting bucket ${key}: shards [${bucket.join(", ")}]`);

      const promises = bucket.map((shardId) => this.connectShard(shardId, totalShards));
      await Promise.all(promises);

      if (sortedKeys.indexOf(key) < sortedKeys.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    this.emit("debug", "All shards connected");
  }

  private async connectShard(shardId: number, totalShards: number): Promise<void> {
    const shardOptions: ShardOptions = {
      token: this.options.token,
      intents: this.options.intents,
      shardId,
      totalShards,
      presence: this.options.presence,
      encoding: this.options.encoding,
      compress: this.options.compress,
    };

    const shard = new Shard(shardOptions);
    this.shards.set(shardId, shard);

    this.forwardEvents(shard);

    await shard.connect();
  }

  private forwardEvents(shard: Shard): void {
    shard.on("ready", () => {
      this.emit("ready", shard.shardId);
    });

    shard.on("dispatch", (event: string, data: unknown) => {
      this.emit("dispatch", event, data, shard.shardId);
    });

    shard.on("debug", (msg: string) => {
      this.emit("debug", msg);
    });

    shard.on("error", (error: unknown) => {
      this.emit("error", error, shard.shardId);
    });

    shard.on("close", (code: number, reason: string) => {
      this.emit("close", code, reason, shard.shardId);
    });
  }

  getShard(id: number): Shard | undefined {
    return this.shards.get(id);
  }

  getShards(): Shard[] {
    return [...this.shards.values()];
  }

  get gateway(): APIGatewayBotInfo | null {
    return this.gatewayInfo;
  }

  async destroy(): Promise<void> {
    for (const shard of this.shards.values()) {
      shard.disconnect();
    }
    this.shards.clear();
  }
}
