import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { RESTClient } from "../client.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = (...args: any[]) => any;

function mockFetch(fn: AnyMock) {
  globalThis.fetch = mock(fn) as unknown as typeof fetch;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFetchCalls(): any[] {
  return (globalThis.fetch as any).mock.calls;
}

describe("RESTClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    test("creates client with valid token", () => {
      const client = new RESTClient({ token: "valid-token" });
      expect(client.token).toBe("valid-token");
    });

    test("throws on empty token", () => {
      expect(() => new RESTClient({ token: "" })).toThrow("Token cannot be empty");
    });

    test("throws on whitespace token", () => {
      expect(() => new RESTClient({ token: "Bot xxx" })).toThrow("whitespace");
    });

    test("throws on whitespace-only token", () => {
      expect(() => new RESTClient({ token: "   " })).toThrow("Token cannot be empty");
    });

    test("uses default base URL with version 10", async () => {
      const client = new RESTClient({ token: "t" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][0]).toBe("https://discord.com/api/v10/test");
    });

    test("uses custom version in base URL", async () => {
      const client = new RESTClient({ token: "t", version: 9 });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][0]).toBe("https://discord.com/api/v9/test");
    });

    test("uses custom baseURL", async () => {
      const client = new RESTClient({ token: "t", baseURL: "https://my-proxy.example.com/api/v10" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/guilds/123");
      expect(getFetchCalls()[0][0]).toBe("https://my-proxy.example.com/api/v10/guilds/123");
    });

    test("baseURL overrides version", async () => {
      const client = new RESTClient({ token: "t", version: 9, baseURL: "https://custom.dev/v5" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][0]).toBe("https://custom.dev/v5/test");
    });
  });

  describe("HTTP methods", () => {
    let client: RESTClient;

    beforeEach(() => {
      client = new RESTClient({ token: "test-token" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    });

    test("get calls fetch with GET method", async () => {
      await client.get("/test");
      expect(getFetchCalls()[0][1].method).toBe("GET");
    });

    test("post calls fetch with POST method and body", async () => {
      await client.post("/test", { foo: "bar" });
      expect(getFetchCalls()[0][1].method).toBe("POST");
      expect(getFetchCalls()[0][1].body).toBe('{"foo":"bar"}');
    });

    test("put calls fetch with PUT method", async () => {
      await client.put("/test");
      expect(getFetchCalls()[0][1].method).toBe("PUT");
    });

    test("patch calls fetch with PATCH method", async () => {
      await client.patch("/test", { x: 1 });
      expect(getFetchCalls()[0][1].method).toBe("PATCH");
    });

    test("delete calls fetch with DELETE method", async () => {
      await client.delete("/test");
      expect(getFetchCalls()[0][1].method).toBe("DELETE");
    });

    test("sends Authorization header", async () => {
      await client.get("/test");
      expect(getFetchCalls()[0][1].headers.Authorization).toBe("Bot test-token");
    });

    test("sends Content-Type for JSON", async () => {
      await client.post("/test", {});
      expect(getFetchCalls()[0][1].headers["Content-Type"]).toBe("application/json");
    });

    test("does not send Content-Type for FormData", async () => {
      await client.postFile("/test", { name: "f.txt", data: new Uint8Array() });
      expect(getFetchCalls()[0][1].headers["Content-Type"]).toBeUndefined();
    });

    test("sends custom userAgent", async () => {
      const custom = new RESTClient({ token: "t", userAgent: "MyBot/1.0" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await custom.get("/test");
      expect(getFetchCalls()[0][1].headers["User-Agent"]).toBe("MyBot/1.0");
    });

    test("returns parsed JSON", async () => {
      const result = await client.get("/test");
      expect(result).toEqual({ ok: true });
    });

    test("sends GET without body", async () => {
      await client.get("/test");
      expect(getFetchCalls()[0][1].body).toBeUndefined();
    });

    test("sends POST without body", async () => {
      await client.post("/test");
      expect(getFetchCalls()[0][1].body).toBeUndefined();
    });
  });

  describe("204 No Content", () => {
    test("returns undefined for 204", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 204 })));
      const client = new RESTClient({ token: "t" });
      const result = await client.delete("/channels/123");
      expect(result).toBeUndefined();
    });
  });

  describe("postFile", () => {
    let client: RESTClient;

    beforeEach(() => {
      client = new RESTClient({ token: "test-token" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
    });

    test("sends FormData with file", async () => {
      await client.postFile("/test", { name: "image.png", data: new Uint8Array([1, 2, 3]) });
      expect(getFetchCalls()[0][1].body).toBeInstanceOf(FormData);
    });

    test("includes payload_json when body provided", async () => {
      await client.postFile(
        "/test",
        { name: "file.txt", data: new Uint8Array([1]) },
        { content: "hello" },
      );
      const formData = getFetchCalls()[0][1].body;
      expect(formData.get("payload_json")).toBe('{"content":"hello"}');
    });

    test("does not include payload_json when body is omitted", async () => {
      await client.postFile("/test", { name: "f.txt", data: new Uint8Array() });
      expect(getFetchCalls()[0][1].body.get("payload_json")).toBeNull();
    });
  });

  describe("proxy", () => {
    test("passes string proxy to fetch", async () => {
      const client = new RESTClient({ token: "t", proxy: "http://proxy:8080" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][1].proxy).toBe("http://proxy:8080");
    });

    test("passes object proxy to fetch", async () => {
      const proxy = { url: "http://proxy:8080", headers: { "Proxy-Authorization": "Bearer tok" } };
      const client = new RESTClient({ token: "t", proxy });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][1].proxy).toEqual(proxy);
    });

    test("does not include proxy in fetch when not configured", async () => {
      const client = new RESTClient({ token: "t" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/test");
      expect(getFetchCalls()[0][1].proxy).toBeUndefined();
    });

    test("proxy is passed on every request", async () => {
      const client = new RESTClient({ token: "t", proxy: "http://p:1" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await client.get("/a");
      await client.post("/b");
      expect(getFetchCalls()[0][1].proxy).toBe("http://p:1");
      expect(getFetchCalls()[1][1].proxy).toBe("http://p:1");
    });
  });

  describe("error handling", () => {
    test("throws on 401", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const client = new RESTClient({ token: "bad-token", retries: 0 });
      await expect(client.get("/test")).rejects.toThrow();
    });

    test("throws on 403 immediately", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const client = new RESTClient({ token: "t", retries: 3 });
      await expect(client.get("/test")).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test("throws on 400 immediately", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Bad Request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const client = new RESTClient({ token: "t", retries: 3 });
      await expect(client.get("/test")).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    test("retries on 500", async () => {
      let calls = 0;
      mockFetch(() => {
        calls++;
        if (calls < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      });
      const client = new RESTClient({ token: "test", retries: 3, retryDelay: 0 });
      const result = await client.get("/test");
      expect(result).toEqual({ ok: true });
      expect(calls).toBe(3);
    });

    test("throws after all retries exhausted on 500", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const client = new RESTClient({ token: "t", retries: 2, retryDelay: 0 });
      await expect(client.get("/test")).rejects.toThrow();
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    test("retries on network error", async () => {
      let calls = 0;
      mockFetch(() => {
        calls++;
        if (calls < 2) return Promise.reject(new Error("ECONNREFUSED"));
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      });
      const client = new RESTClient({ token: "t", retries: 3, retryDelay: 0 });
      const result = await client.get("/test");
      expect(result).toEqual({ ok: true });
      expect(calls).toBe(2);
    });

    test("throws after all retries on network error", async () => {
      mockFetch(() => Promise.reject(new Error("ECONNREFUSED")));
      const client = new RESTClient({ token: "t", retries: 1, retryDelay: 0 });
      await expect(client.get("/test")).rejects.toThrow("Network error");
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    test("retries on 429 non-shared then succeeds", async () => {
      let calls = 0;
      mockFetch(() => {
        calls++;
        if (calls === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Rate Limited", retry_after: 0.01 }), {
              status: 429,
              headers: { "Content-Type": "application/json", "X-RateLimit-Scope": "user" },
            }),
          );
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      });
      const client = new RESTClient({ token: "t", retries: 3, retryDelay: 0 });
      const result = await client.get("/test");
      expect(result).toEqual({ ok: true });
      expect(calls).toBe(2);
    });

    test("throws on 429 shared scope after max retries", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Rate Limited", retry_after: 0.01 }), {
            status: 429,
            headers: { "Content-Type": "application/json", "X-RateLimit-Scope": "shared" },
          }),
        ),
      );
      const client = new RESTClient({ token: "t", retries: 2, retryDelay: 0 });
      await expect(client.get("/test")).rejects.toThrow();
    });
  });

  describe("baseUrl construction", () => {
    test("combines baseURL + path correctly", async () => {
      const client = new RESTClient({ token: "t", baseURL: "https://a.b/c" });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
      await client.get("/d/e");
      expect(getFetchCalls()[0][0]).toBe("https://a.b/c/d/e");
    });

    test("default baseUrl uses version", async () => {
      const client = new RESTClient({ token: "t", version: 11 });
      mockFetch(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
      await client.get("/guilds");
      expect(getFetchCalls()[0][0]).toBe("https://discord.com/api/v11/guilds");
    });
  });
});
