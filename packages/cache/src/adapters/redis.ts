import { redis as defaultRedis, RedisClient } from "bun";
import type { CacheAdapter, CacheOptions } from "../adapter.js";

export interface RedisAdapterOptions {
  url?: string;
  client?: RedisClient;
  prefix?: string;
  max?: number;
  sweepInterval?: number;
}

export class RedisAdapter implements CacheAdapter {
  private client: RedisClient;
  private prefix: string;
  private defaultMax?: number;

  constructor(options?: RedisAdapterOptions) {
    this.client =
      options?.client ?? (options?.url ? new RedisClient(options.url, {}) : defaultRedis);
    this.prefix = options?.prefix ?? "dbun:cache:";
    this.defaultMax = options?.max;
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }

  private async evictIfNeeded(max: number): Promise<void> {
    const current = (await this.client.send("DBSIZE", [])) as number;
    if (current < max) return;
    const key = (await this.client.send("RANDOMKEY", [])) as string | null;
    if (key && key.startsWith(this.prefix)) {
      await this.client.del(key);
    }
  }

  async stop(): Promise<void> {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(this.prefixed(key));
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const k = this.prefixed(key);
    const max = options?.max ?? this.defaultMax;
    if (max) {
      await this.evictIfNeeded(max);
    }
    await this.client.set(k, JSON.stringify(value));
    if (options?.maxAge) {
      await this.client.expire(k, Math.floor(options.maxAge / 1000));
    }
  }

  async delete(key: string): Promise<boolean> {
    const count = await this.client.del(this.prefixed(key));
    return count > 0;
  }

  async has(key: string): Promise<boolean> {
    return this.client.exists(this.prefixed(key));
  }

  async clear(): Promise<void> {
    const keys = (await this.client.send("KEYS", [`${this.prefix}*`])) as string[];
    if (keys.length > 0) {
      await this.client.send("DEL", keys);
    }
  }

  async size(): Promise<number> {
    const keys = (await this.client.send("KEYS", [`${this.prefix}*`])) as string[];
    return keys.length;
  }

  async keys(): Promise<string[]> {
    const keys = (await this.client.send("KEYS", [`${this.prefix}*`])) as string[];
    return keys.map((k) => k.slice(this.prefix.length));
  }

  async values<T>(): Promise<T[]> {
    const keys = (await this.client.send("KEYS", [`${this.prefix}*`])) as string[];
    if (keys.length === 0) return [];
    const values = await Promise.all(keys.map((k) => this.client.get(k)));
    return values.filter((v) => v !== null).map((v) => JSON.parse(v!)) as T[];
  }

  async entries<T>(): Promise<[string, T][]> {
    const keys = (await this.client.send("KEYS", [`${this.prefix}*`])) as string[];
    if (keys.length === 0) return [];
    const values = await Promise.all(keys.map((k) => this.client.get(k)));
    const result: [string, T][] = [];
    for (let i = 0; i < keys.length; i++) {
      const v = values[i];
      if (v !== null) {
        result.push([keys[i]!.slice(this.prefix.length), JSON.parse(v!) as T]);
      }
    }
    return result;
  }

  async forEach<T>(callback: (value: T, key: string) => void): Promise<void> {
    const entries = await this.entries<T>();
    for (const [key, value] of entries) {
      callback(value, key);
    }
  }
}
