import type { CacheAdapter } from "./adapter.js";
import type { CacheStrategyOptions } from "./strategy.js";
import { MemoryAdapter } from "./adapters/memory.js";
import { Collection } from "./collection.js";

export interface CacheManagerOptions {
  adapter?: CacheAdapter;
  strategy?: Record<string, CacheStrategyOptions>;
}

export class CacheManager {
  private adapter: CacheAdapter;
  private strategies: Record<string, CacheStrategyOptions>;

  constructor(options?: CacheManagerOptions) {
    this.adapter = options?.adapter ?? new MemoryAdapter();
    this.strategies = options?.strategy ?? {};
  }

  getAdapter(): CacheAdapter {
    return this.adapter;
  }

  getStrategy(namespace: string): CacheStrategyOptions | undefined {
    return this.strategies[namespace];
  }

  setStrategy(namespace: string, options: CacheStrategyOptions): void {
    this.strategies[namespace] = options;
  }

  async stop(): Promise<void> {
    await this.adapter.stop();
  }

  async sweep(): Promise<void> {
    await this.adapter.stop();
  }

  async get<T>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }

  async set<T>(key: string, value: T, namespace?: string): Promise<void> {
    const strategy = namespace ? this.strategies[namespace] : undefined;
    await this.adapter.set(key, value, {
      maxAge: strategy?.maxAge,
      max: strategy?.max,
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.adapter.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const allKeys = await this.adapter.keys();
    let count = 0;
    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        const deleted = await this.adapter.delete(key);
        if (deleted) count++;
      }
    }
    return count;
  }

  async has(key: string): Promise<boolean> {
    return this.adapter.has(key);
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async size(): Promise<number> {
    return this.adapter.size();
  }

  createCollection<K, V>(_namespace: string): Collection<K, V> {
    return new Collection<K, V>();
  }
}
