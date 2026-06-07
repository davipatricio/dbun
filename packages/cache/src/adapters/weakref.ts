import type { CacheAdapter, CacheOptions } from "../adapter.js";

const DEFAULT_SWEEP_INTERVAL = 21_600_000;

interface WeakEntry {
  ref: WeakRef<object>;
  expiresAt?: number;
  registrant: object;
}

export class WeakRefAdapter implements CacheAdapter {
  private store = new Map<string, WeakEntry>();
  private _keys = new Set<string>();
  private registry: FinalizationRegistry<string>;
  private defaultMaxAge?: number;
  private defaultMax?: number;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: CacheOptions) {
    this.defaultMaxAge = options?.maxAge;
    this.defaultMax = options?.max;

    this.registry = new FinalizationRegistry((key: string) => {
      this.store.delete(key);
      this._keys.delete(key);
    });

    const interval = options?.sweepInterval ?? DEFAULT_SWEEP_INTERVAL;
    if (interval > 0) {
      this.sweepTimer = setInterval(() => this.cleanup(), interval);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key of this._keys) {
      const entry = this.store.get(key);
      if (!entry) {
        this._keys.delete(key);
        continue;
      }
      if (!entry.ref.deref()) {
        this.store.delete(key);
        this._keys.delete(key);
      } else if (entry.expiresAt && now > entry.expiresAt) {
        this.registry.unregister(entry.registrant);
        this.store.delete(key);
        this._keys.delete(key);
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
    const entry = this.store.get(key);
    if (!entry) return null;

    const ref = entry.ref.deref();
    if (!ref) {
      this.store.delete(key);
      this._keys.delete(key);
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.registry.unregister(entry.registrant);
      this.store.delete(key);
      this._keys.delete(key);
      return null;
    }

    return ref as unknown as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const existing = this.store.get(key);
    if (existing) {
      this.registry.unregister(existing.registrant);
    }

    const maxAge = options?.maxAge ?? this.defaultMaxAge;
    const expiresAt = maxAge ? Date.now() + maxAge : undefined;
    const max = options?.max ?? this.defaultMax;

    const obj = value as unknown as object;
    const ref = new WeakRef(obj);
    this.store.set(key, { ref, expiresAt, registrant: obj });
    this._keys.add(key);
    this.registry.register(obj, key, obj);

    if (max && this._keys.size > max) {
      this.cleanup();
      if (this._keys.size > max) {
        const first = this._keys.values().next().value;
        if (first !== undefined) {
          const entry = this.store.get(first);
          if (entry) this.registry.unregister(entry.registrant);
          this.store.delete(first);
          this._keys.delete(first);
        }
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (entry) {
      this.registry.unregister(entry.registrant);
    }
    this._keys.delete(key);
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;

    const ref = entry.ref.deref();
    if (!ref) {
      this.store.delete(key);
      this._keys.delete(key);
      return false;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.registry.unregister(entry.registrant);
      this.store.delete(key);
      this._keys.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    for (const entry of this.store.values()) {
      this.registry.unregister(entry.registrant);
    }
    this.store.clear();
    this._keys.clear();
  }

  async size(): Promise<number> {
    this.cleanup();
    return this._keys.size;
  }

  async keys(): Promise<string[]> {
    this.cleanup();
    return [...this._keys];
  }

  async values<T>(): Promise<T[]> {
    const result: T[] = [];
    for (const key of this._keys) {
      const entry = this.store.get(key);
      if (!entry) continue;
      const ref = entry.ref.deref() as T | undefined;
      if (ref !== undefined) {
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.registry.unregister(entry.registrant);
          this.store.delete(key);
          this._keys.delete(key);
          continue;
        }
        result.push(ref);
      } else {
        this.store.delete(key);
        this._keys.delete(key);
      }
    }
    return result;
  }

  async entries<T>(): Promise<[string, T][]> {
    const result: [string, T][] = [];
    for (const key of this._keys) {
      const entry = this.store.get(key);
      if (!entry) continue;
      const ref = entry.ref.deref() as T | undefined;
      if (ref !== undefined) {
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.registry.unregister(entry.registrant);
          this.store.delete(key);
          this._keys.delete(key);
          continue;
        }
        result.push([key, ref]);
      } else {
        this.store.delete(key);
        this._keys.delete(key);
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
