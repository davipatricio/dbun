export class RateLimiter {
  private buckets = new Map<string, BucketState>();
  private globalResetAt = 0;
  private inflight = new Map<string, Promise<void>>();

  constructor(private options: RateLimiterOptions = {}) {}

  async acquire(route: string): Promise<void> {
    await this.waitForGlobal();

    const bucketKey = this.resolveBucketKey(route);

    const prev = this.inflight.get(bucketKey) ?? Promise.resolve();
    const next = prev.then(() => this.throttle(bucketKey));
    this.inflight.set(
      bucketKey,
      next.then(() => {}),
    );
    await next;
  }

  update(route: string, headers: RateLimitHeaders): void {
    const bucketHash = headers.bucket;
    if (!bucketHash) return;

    const topLevel = this.extractTopLevel(route);
    const bucketKey = `${topLevel}:${bucketHash}`;

    this.routeToBucket.set(route, bucketKey);

    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = { limit: 1, remaining: 1, resetAt: 0 };
      this.buckets.set(bucketKey, bucket);
    }

    if (headers.limit !== null) bucket.limit = parseInt(headers.limit, 10);
    if (headers.remaining !== null) bucket.remaining = parseInt(headers.remaining, 10);

    if (headers.resetAfter !== null) {
      bucket.resetAt = Date.now() + parseFloat(headers.resetAfter) * 1000;
    } else if (headers.reset !== null) {
      bucket.resetAt = parseFloat(headers.reset) * 1000;
    }
  }

  handle429(body: { retry_after?: number; global?: boolean }): void {
    const retryAfterMs = (body.retry_after ?? 1) * 1000;
    if (body.global) {
      this.globalResetAt = Date.now() + retryAfterMs;
    }
  }

  private routeToBucket = new Map<string, string>();

  private resolveBucketKey(route: string): string {
    return this.routeToBucket.get(route) ?? this.extractTopLevel(route);
  }

  private extractTopLevel(route: string): string {
    const segments = route.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const resource = segments[0]!;
      const id = segments[1]!;
      if (["channels", "guilds", "webhooks"].includes(resource)) {
        return `${resource}:${id}`;
      }
    }
    return route;
  }

  private async waitForGlobal(): Promise<void> {
    if (this.globalResetAt > Date.now()) {
      await Bun.sleep(this.globalResetAt - Date.now() + 50);
    }
  }

  private async throttle(bucketKey: string): Promise<void> {
    const bucket = this.buckets.get(bucketKey);
    if (!bucket) return;

    if (bucket.remaining <= 0 && bucket.resetAt > Date.now()) {
      const wait = bucket.resetAt - Date.now() + (this.options.retryDelay ?? 50);
      await Bun.sleep(wait);
      bucket.remaining = bucket.limit;
    }

    bucket.remaining = Math.max(0, bucket.remaining - 1);
  }
}

export interface RateLimiterOptions {
  retryDelay?: number;
}

interface BucketState {
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimitHeaders {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
  resetAfter: string | null;
  bucket: string | null;
  global: string | null;
  scope: string | null;
}
