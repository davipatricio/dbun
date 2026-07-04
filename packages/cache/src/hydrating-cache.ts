import type { CacheManager } from "./cache-manager.js";

export type HydrateFn<T> = (data: unknown) => T;
export type PartialHydrateFn<T> = (data: unknown) => T;

export interface CacheEnvelope {
  partial: boolean;
  data: unknown;
}

interface FullEntry<T> {
  kind: "full";
  value: T;
}

interface PartialEntry {
  kind: "partial";
  value: unknown;
}

type PoolEntry<T> = FullEntry<T> | PartialEntry;

export function isPartialEntry(entry: unknown): entry is PartialEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "kind" in entry &&
    (entry as PoolEntry<unknown>).kind === "partial"
  );
}

export function getPartialValue(entry: unknown): unknown | undefined {
  if (isPartialEntry(entry)) return entry.value;
  return undefined;
}

export function getFullValue<T>(entry: unknown): T | undefined {
  if (typeof entry === "object" && entry !== null && "kind" in entry) {
    const e = entry as PoolEntry<T>;
    if (e.kind === "full") return e.value;
  }
  return undefined;
}

function hasPatch(val: unknown): val is { _patch(data: unknown): void } {
  return typeof val === "object" && val !== null && "_patch" in val;
}

export interface HydratingCacheOptions<T> {
  raw: CacheManager;
  namespace: string;
  hydrate: HydrateFn<T>;
  partialHydrate?: PartialHydrateFn<unknown>;
}

export class HydratingCache<T> {
  private pool = new Map<string, PoolEntry<T>>();
  private raw: CacheManager;
  private namespace: string;
  private hydrate: HydrateFn<T>;
  private partialHydrate?: PartialHydrateFn<unknown>;

  constructor(options: HydratingCacheOptions<T>) {
    this.raw = options.raw;
    this.namespace = options.namespace;
    this.hydrate = options.hydrate;
    this.partialHydrate = options.partialHydrate;
  }

  async get(id: string): Promise<T | null> {
    let env: CacheEnvelope | null;
    try {
      env = await this.raw.get<CacheEnvelope>(id);
    } catch {
      return null;
    }

    if (!env) {
      this.pool.delete(id);
      return null;
    }

    if (env.partial) {
      this.pool.delete(id);
      return null;
    }

    const existing = this.pool.get(id);
    if (existing) {
      const val = getFullValue<T>(existing);
      if (val) {
        if (hasPatch(val)) val._patch(env.data);
        return val;
      }
    }

    const full = this.hydrate(env.data);
    this.pool.set(id, { kind: "full", value: full });
    return full;
  }

  async getPartial(id: string): Promise<unknown | null> {
    let env: CacheEnvelope | null;
    try {
      env = await this.raw.get<CacheEnvelope>(id);
    } catch {
      return null;
    }

    if (!env) {
      this.pool.delete(id);
      return null;
    }

    if (!env.partial) {
      this.pool.delete(id);
      return null;
    }

    const existing = this.pool.get(id);
    if (existing) {
      const val = getPartialValue(existing);
      if (val !== undefined) {
        if (hasPatch(val)) val._patch(env.data);
        return val;
      }
    }

    if (this.partialHydrate) {
      const partial = this.partialHydrate(env.data);
      this.pool.set(id, { kind: "partial", value: partial });
      return partial;
    }

    return null;
  }

  async has(id: string): Promise<boolean> {
    return this.raw.has(id);
  }

  async add(id: string, data: unknown, options?: { partial?: boolean }): Promise<void> {
    const env: CacheEnvelope = { partial: options?.partial ?? false, data };
    await this.raw.set(id, env, this.namespace);

    const inPool = this.pool.get(id);
    if (!inPool) return;

    if (isPartialEntry(inPool) && env.partial) {
      if (hasPatch(inPool.value)) inPool.value._patch(env.data);
    } else if (getFullValue<T>(inPool) && !env.partial) {
      const full = getFullValue<T>(inPool)!;
      if (hasPatch(full)) full._patch(env.data);
    } else {
      this.pool.delete(id);
    }
  }

  async delete(id: string): Promise<boolean> {
    this.pool.delete(id);
    return this.raw.delete(id);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const allKeys = await this.raw.getAdapter().keys();
    let count = 0;
    for (const key of allKeys) {
      if (key.startsWith(prefix)) {
        this.pool.delete(key);
        const deleted = await this.raw.delete(key);
        if (deleted) count++;
      }
    }
    return count;
  }

  async size(): Promise<number> {
    return this.raw.size();
  }

  async values(): Promise<T[]> {
    const keys = await this.raw.getAdapter().keys();
    const result: T[] = [];
    for (const key of keys) {
      const val = await this.get(key);
      if (val) result.push(val);
    }
    return result;
  }

  async entries(): Promise<[string, T][]> {
    const keys = await this.raw.getAdapter().keys();
    const result: [string, T][] = [];
    for (const key of keys) {
      const val = await this.get(key);
      if (val) result.push([key, val]);
    }
    return result;
  }

  async clear(): Promise<void> {
    this.pool.clear();
    await this.raw.clear();
  }

  async stop(): Promise<void> {
    this.pool.clear();
    await this.raw.stop();
  }
}
