import { describe, test, expect } from "bun:test";
import { DiscordAPIError } from "../errors.js";

describe("DiscordAPIError", () => {
  test("sets status and message", () => {
    const err = new DiscordAPIError(404, { message: "Not Found" });
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not Found");
  });

  test("sets code from body", () => {
    const err = new DiscordAPIError(400, { message: "Bad Request", code: 50035 });
    expect(err.code).toBe(50035);
  });

  test("sets errors from body", () => {
    const errors = { field: "required" };
    const err = new DiscordAPIError(400, { message: "Bad Request", errors });
    expect(err.errors).toBe(errors);
  });

  test("parses retryAfter from body", () => {
    const err = new DiscordAPIError(429, { message: "Rate Limited", retry_after: 2.5 });
    expect(err.retryAfter).toBe(2.5);
  });

  test("parses isGlobal from body", () => {
    const err = new DiscordAPIError(429, { message: "Rate Limited", global: true });
    expect(err.isGlobal).toBe(true);
  });

  test("defaults isGlobal to false", () => {
    const err = new DiscordAPIError(429, { message: "Rate Limited" });
    expect(err.isGlobal).toBe(false);
  });

  test("parses scope from headers", () => {
    const headers = new Headers({ "X-RateLimit-Scope": "shared" });
    const err = new DiscordAPIError(429, { message: "Rate Limited" }, headers);
    expect(err.scope).toBe("shared");
  });

  test("defaults scope to undefined when no header", () => {
    const err = new DiscordAPIError(400, { message: "Bad" });
    expect(err.scope).toBeUndefined();
  });

  test("defaults message when body has no message", () => {
    const err = new DiscordAPIError(500, {});
    expect(err.message).toBe("Discord API Error: 500");
  });

  test("status 0 for network errors", () => {
    const err = new DiscordAPIError(0, { message: "Network error: fetch failed" });
    expect(err.status).toBe(0);
    expect(err.message).toBe("Network error: fetch failed");
    expect(err.isClientError).toBe(false);
    expect(err.isServerError).toBe(false);
    expect(err.isRateLimited).toBe(false);
    expect(err.isRetryable).toBe(false);
  });

  test("handles empty body object", () => {
    const err = new DiscordAPIError(400, {});
    expect(err.status).toBe(400);
    expect(err.code).toBeUndefined();
    expect(err.errors).toBeUndefined();
    expect(err.retryAfter).toBeUndefined();
  });

  describe("computed properties", () => {
    test("isRateLimited is true for 429", () => {
      const err = new DiscordAPIError(429, { message: "RL" });
      expect(err.isRateLimited).toBe(true);
    });

    test("isRateLimited is false for other statuses", () => {
      const err = new DiscordAPIError(400, { message: "Bad" });
      expect(err.isRateLimited).toBe(false);
    });

    test("isServerError is true for 5xx", () => {
      expect(new DiscordAPIError(500, {}).isServerError).toBe(true);
      expect(new DiscordAPIError(502, {}).isServerError).toBe(true);
      expect(new DiscordAPIError(503, {}).isServerError).toBe(true);
    });

    test("isServerError is false for 4xx", () => {
      expect(new DiscordAPIError(400, {}).isServerError).toBe(false);
    });

    test("isClientError is true for 4xx", () => {
      expect(new DiscordAPIError(400, {}).isClientError).toBe(true);
      expect(new DiscordAPIError(401, {}).isClientError).toBe(true);
      expect(new DiscordAPIError(403, {}).isClientError).toBe(true);
    });

    test("isClientError is false for 5xx", () => {
      expect(new DiscordAPIError(500, {}).isClientError).toBe(false);
    });

    test("isRetryable is true for 429 and 5xx", () => {
      expect(new DiscordAPIError(429, {}).isRetryable).toBe(true);
      expect(new DiscordAPIError(500, {}).isRetryable).toBe(true);
    });

    test("isRetryable is false for 4xx", () => {
      expect(new DiscordAPIError(400, {}).isRetryable).toBe(false);
    });
  });
});
