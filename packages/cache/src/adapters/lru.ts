import type { CacheAdapter, CacheOptions } from "../adapter.js";

const DEFAULT_SWEEP_INTERVAL = 21_600_000;

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

export class LRUAdapter implements CacheAdapter {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultMaxAge?: number;
  private defaultMax?: number;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: CacheOptions) {
    this.defaultMaxAge = options?.maxAge;
    this.defaultMax = options?.max;

    const interval = options?.sweepInterval ?? DEFAULT_SWEEP_INTERVAL;
    if (interval > 0) {
      this.sweepTimer = setInterval(() => this.sweep(), interval);
    }
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.sweepTimer !== null) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const maxAge = options?.maxAge ?? this.defaultMaxAge;
    const expiresAt = maxAge ? Date.now() + maxAge : undefined;
    const max = options?.max ?? this.defaultMax;

    if (this.store.has(key)) {
      this.store.delete(key);
    }

    if (max && this.store.size >= max) {
      const lruKey = this.store.keys().next().value;
      if (lruKey) this.store.delete(lruKey);
    }

    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async values<T>(): Promise<T[]> {
    return [...this.store.values()].map((e) => e.value) as T[];
  }

  async entries<T>(): Promise<[string, T][]> {
    return [...this.store.entries()].map(([k, e]) => [k, e.value]) as [string, T][];
  }

  async forEach<T>(callback: (value: T, key: string) => void): Promise<void> {
    for (const [key, entry] of this.store) {
      callback(entry.value as T, key);
    }
  }
}
