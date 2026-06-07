export class Collection<K, V> extends Map<K, V> {
  find(predicate: (value: V, key: K) => boolean): V | undefined {
    for (const [key, value] of this) {
      if (predicate(value, key)) return value;
    }
    return undefined;
  }

  findKey(predicate: (value: V, key: K) => boolean): K | undefined {
    for (const [key, value] of this) {
      if (predicate(value, key)) return key;
    }
    return undefined;
  }

  filter(predicate: (value: V, key: K) => boolean): Collection<K, V> {
    const result = new Collection<K, V>();
    for (const [key, value] of this) {
      if (predicate(value, key)) result.set(key, value);
    }
    return result;
  }

  map<T>(fn: (value: V, key: K) => T): T[] {
    const result: T[] = [];
    for (const [key, value] of this) {
      result.push(fn(value, key));
    }
    return result;
  }

  some(predicate: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (predicate(value, key)) return true;
    }
    return false;
  }

  every(predicate: (value: V, key: K) => boolean): boolean {
    for (const [key, value] of this) {
      if (!predicate(value, key)) return false;
    }
    return true;
  }

  random(): V | undefined {
    const entries = [...this.values()];
    return entries[Math.floor(Math.random() * entries.length)];
  }

  first(): V | undefined {
    return this.values().next().value;
  }

  last(): V | undefined {
    const entries = [...this.values()];
    return entries[entries.length - 1];
  }

  sort(
    compareFn: (a: [K, V], b: [K, V]) => number = ([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0),
  ): this {
    const entries = [...this.entries()].sort(compareFn);
    this.clear();
    for (const [key, value] of entries) {
      this.set(key, value);
    }
    return this;
  }
}
