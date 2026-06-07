export interface CacheOptions {
  maxAge?: number;
  max?: number;
  sweepInterval?: number;
}

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
  values<T>(): Promise<T[]>;
  entries<T>(): Promise<[string, T][]>;
  forEach<T>(callback: (value: T, key: string) => void): Promise<void>;
  stop(): Promise<void>;
}
