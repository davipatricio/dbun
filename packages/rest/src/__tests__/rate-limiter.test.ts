import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RateLimiter } from "../rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ retryDelay: 0 });
  });

  afterEach(async () => {
    await Bun.sleep(0);
  });

  describe("update", () => {
    test("stores bucket state from headers", () => {
      limiter.update("/channels/123/messages", {
        limit: "5",
        remaining: "4",
        reset: null,
        resetAfter: "1.5",
        bucket: "abc123",
        global: null,
        scope: null,
      });
      const bucket = (limiter as any).buckets.get("channels:123:abc123");
      expect(bucket).toBeDefined();
      expect(bucket.limit).toBe(5);
      expect(bucket.remaining).toBe(4);
    });

    test("ignores update without bucket header", () => {
      limiter.update("/channels/123/messages", {
        limit: null,
        remaining: null,
        reset: null,
        resetAfter: null,
        bucket: null,
        global: null,
        scope: null,
      });
      expect((limiter as any).buckets.size).toBe(0);
    });

    test("uses resetAfter over reset", () => {
      limiter.update("/channels/100/test", {
        limit: "1",
        remaining: "1",
        reset: "9999999",
        resetAfter: "0.1",
        bucket: "b1",
        global: null,
        scope: null,
      });
      const bucket = (limiter as any).buckets.get("channels:100:b1");
      expect(bucket.resetAt).toBeLessThan(Date.now() + 200);
    });

    test("uses reset when resetAfter is null", () => {
      limiter.update("/channels/50/x", {
        limit: "1",
        remaining: "1",
        reset: String((Date.now() + 500) / 1000),
        resetAfter: null,
        bucket: "b2",
        global: null,
        scope: null,
      });
      const bucket = (limiter as any).buckets.get("channels:50:b2");
      expect(bucket.resetAt).toBeGreaterThan(Date.now() + 100);
    });

    test("creates new bucket if not exists", () => {
      expect((limiter as any).buckets.size).toBe(0);
      limiter.update("/guilds/1/roles", {
        limit: "10",
        remaining: "9",
        reset: null,
        resetAfter: "2",
        bucket: "new",
        global: null,
        scope: null,
      });
      expect((limiter as any).buckets.size).toBe(1);
    });

    test("updates existing bucket in place", () => {
      limiter.update("/guilds/1/roles", {
        limit: "10",
        remaining: "9",
        reset: null,
        resetAfter: "1",
        bucket: "existing",
        global: null,
        scope: null,
      });
      limiter.update("/guilds/1/roles", {
        limit: "10",
        remaining: "5",
        reset: null,
        resetAfter: "0.5",
        bucket: "existing",
        global: null,
        scope: null,
      });
      const bucket = (limiter as any).buckets.get("guilds:1:existing");
      expect(bucket.remaining).toBe(5);
    });
  });

  describe("handle429", () => {
    test("sets global reset time for global 429", () => {
      limiter.handle429({ retry_after: 1, global: true });
      const globalReset = (limiter as any).globalResetAt;
      expect(globalReset).toBeGreaterThan(Date.now());
    });

    test("does not set global reset for non-global 429", () => {
      limiter.handle429({ retry_after: 1, global: false });
      expect((limiter as any).globalResetAt).toBe(0);
    });

    test("defaults retry_after to 1 second", () => {
      limiter.handle429({ global: true });
      const globalReset = (limiter as any).globalResetAt;
      expect(globalReset).toBeGreaterThan(Date.now() + 500);
      expect(globalReset).toBeLessThan(Date.now() + 2000);
    });
  });

  describe("extractTopLevel", () => {
    test("extracts channels resource", () => {
      const result = (limiter as any).extractTopLevel("/channels/123/messages");
      expect(result).toBe("channels:123");
    });

    test("extracts guilds resource", () => {
      const result = (limiter as any).extractTopLevel("/guilds/456/roles");
      expect(result).toBe("guilds:456");
    });

    test("extracts webhooks resource", () => {
      const result = (limiter as any).extractTopLevel("/webhooks/789/token");
      expect(result).toBe("webhooks:789");
    });

    test("returns full path for unknown resources", () => {
      const result = (limiter as any).extractTopLevel("/applications/123/commands");
      expect(result).toBe("/applications/123/commands");
    });

    test("handles single segment path", () => {
      const result = (limiter as any).extractTopLevel("/gateway");
      expect(result).toBe("/gateway");
    });

    test("handles empty path", () => {
      const result = (limiter as any).extractTopLevel("/");
      expect(result).toBe("/");
    });
  });

  describe("resolveBucketKey", () => {
    test("returns mapped bucket key if available", () => {
      (limiter as any).routeToBucket.set("/test", "test:bucket1");
      const result = (limiter as any).resolveBucketKey("/test");
      expect(result).toBe("test:bucket1");
    });

    test("falls back to extractTopLevel", () => {
      const result = (limiter as any).resolveBucketKey("/channels/123/messages");
      expect(result).toBe("channels:123");
    });
  });

  describe("acquire", () => {
    test("resolves immediately for unknown buckets", async () => {
      const start = Date.now();
      await limiter.acquire("/unknown/route");
      expect(Date.now() - start).toBeLessThan(100);
    });

    test("waits when bucket is depleted", async () => {
      limiter.update("/channels/1/c", {
        limit: "1",
        remaining: "0",
        reset: null,
        resetAfter: "0.05",
        bucket: "depleted",
        global: null,
        scope: null,
      });
      const start = Date.now();
      await limiter.acquire("/channels/1/c");
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(30);
    });

    test("serializes concurrent requests on same bucket", async () => {
      limiter.update("/guilds/1/members", {
        limit: "2",
        remaining: "2",
        reset: null,
        resetAfter: "0.1",
        bucket: "serial",
        global: null,
        scope: null,
      });
      let running = 0;
      let maxConcurrent = 0;
      const original = (limiter as any).throttle.bind(limiter);
      (limiter as any).throttle = async (key: string) => {
        running++;
        maxConcurrent = Math.max(maxConcurrent, running);
        await original(key);
        running--;
      };
      await Promise.all([
        limiter.acquire("/guilds/1/members"),
        limiter.acquire("/guilds/1/members"),
        limiter.acquire("/guilds/1/members"),
      ]);
      expect(maxConcurrent).toBe(1);
    });
  });

  describe("global rate limit", () => {
    test("acquire waits when global limit is active", async () => {
      (limiter as any).globalResetAt = Date.now() + 50;
      const start = Date.now();
      await limiter.acquire("/any/route");
      expect(Date.now() - start).toBeGreaterThanOrEqual(30);
    });

    test("acquire resolves immediately when global limit is expired", async () => {
      (limiter as any).globalResetAt = Date.now() - 100;
      const start = Date.now();
      await limiter.acquire("/any/route");
      expect(Date.now() - start).toBeLessThan(100);
    });
  });

  describe("route mapping", () => {
    test("update creates route-to-bucket mapping", () => {
      limiter.update("/channels/42/messages", {
        limit: "5",
        remaining: "5",
        reset: null,
        resetAfter: "1",
        bucket: "hash123",
        global: null,
        scope: null,
      });
      const mapped = (limiter as any).routeToBucket.get("/channels/42/messages");
      expect(mapped).toBe("channels:42:hash123");
    });

    test("resolveBucketKey uses mapping after update", () => {
      limiter.update("/guilds/99/bans", {
        limit: "5",
        remaining: "5",
        reset: null,
        resetAfter: "1",
        bucket: "banhash",
        global: null,
        scope: null,
      });
      const key = (limiter as any).resolveBucketKey("/guilds/99/bans");
      expect(key).toBe("guilds:99:banhash");
    });
  });
});
