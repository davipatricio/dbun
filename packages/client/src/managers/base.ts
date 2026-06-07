import { CacheManager } from "@dbun/cache";
import type { RESTClient } from "@dbun/rest";
import type { ClientContext } from "@dbun/structures";

export class BaseManager<T> {
  readonly cache: CacheManager;
  protected readonly rest: RESTClient;
  protected readonly namespace: string;
  protected context?: ClientContext;

  constructor(rest: RESTClient, cache: CacheManager, namespace: string) {
    this.rest = rest;
    this.cache = cache;
    this.namespace = namespace;
  }

  setContext(context: ClientContext): void {
    this.context = context;
  }

  async fetch(..._args: string[]): Promise<T | null> {
    throw new Error(`fetch() not implemented for ${this.namespace}`);
  }
}
