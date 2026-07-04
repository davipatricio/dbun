import { describe, test, expect, beforeAll, spyOn } from "bun:test";
import { InteractionServer } from "../server.js";
import { InteractionRouter } from "../handler.js";

const PUBLIC_KEY_HEX = "d899813185dbfe9098a64ed16a8f27ea23b4d7b09350cd4b0eaca235446d4a5f";
const PRIVATE_KEY_PKCS8_HEX =
  "302e020100300506032b65700422042015a802eb2b9fc8438c900171ea74b2f63643bf740bd5d2f06f153406183ebdb9";

let privateKey: CryptoKey;

async function signBody(
  body: string,
  timestamp: string,
): Promise<{ signature: string; timestamp: string }> {
  const enc = new TextEncoder();
  const tsBytes = enc.encode(timestamp);
  const bodyBytes = enc.encode(body);
  const combined = new Uint8Array(tsBytes.length + bodyBytes.length);
  combined.set(tsBytes);
  combined.set(bodyBytes, tsBytes.length);

  const sigBuf = await crypto.subtle.sign({ name: "Ed25519" }, privateKey, combined);
  const sigHex = Buffer.from(sigBuf).toString("hex");
  return { signature: sigHex, timestamp };
}

function makeRequest(body: string, headers: Record<string, string>): Request {
  return new Request("https://example.com/webhook", {
    method: "POST",
    headers,
    body,
  });
}

async function makeSignedRequest(
  body: object | string,
  extraHeaders: Record<string, string> = {},
): Promise<Request> {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const { signature } = await signBody(bodyStr, timestamp);
  return makeRequest(bodyStr, {
    "x-signature-ed25519": signature,
    "x-signature-timestamp": timestamp,
    ...extraHeaders,
  });
}

describe("InteractionServer", () => {
  beforeAll(async () => {
    const privRaw = new Uint8Array(
      PRIVATE_KEY_PKCS8_HEX.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privRaw,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
  });

  describe("method validation", () => {
    test("returns 405 for non-POST", async () => {
      const router = new InteractionRouter();
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const req = new Request("https://example.com", { method: "GET" });
      const res = await server.handleRequest(req);
      expect(res.status).toBe(405);
    });
  });

  describe("signature validation", () => {
    test("returns 401 when signature headers are missing", async () => {
      const router = new InteractionRouter();
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const req = makeRequest("{}", { "content-type": "application/json" });
      const res = await server.handleRequest(req);
      expect(res.status).toBe(401);
    });

    test("returns 401 with invalid signature", async () => {
      const router = new InteractionRouter();
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const req = makeRequest("{}", {
        "x-signature-ed25519": "00".repeat(64),
        "x-signature-timestamp": "1234567890",
      });
      const res = await server.handleRequest(req);
      expect(res.status).toBe(401);
    });

    test("returns 401 with tampered body", async () => {
      const router = new InteractionRouter();
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const timestamp = "1700000000";
      const { signature } = await signBody("{}", timestamp);
      const req = makeRequest('{"type":2}', {
        "x-signature-ed25519": signature,
        "x-signature-timestamp": timestamp,
      });
      const res = await server.handleRequest(req);
      expect(res.status).toBe(401);
    });
  });

  describe("PING handling", () => {
    test("responds with {type:1} inline for PING interactions", async () => {
      const router = new InteractionRouter();
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const req = await makeSignedRequest({ type: 1 });
      const res = await server.handleRequest(req);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { type: number };
      expect(body.type).toBe(1);
    });

    test("does not call router.handle for PING", async () => {
      const router = new InteractionRouter();
      const handleSpy = spyOn(router as any, "handle").mockResolvedValue(undefined);
      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: { post: () => Promise.resolve({}) } as any,
        router,
      });
      const req = await makeSignedRequest({ type: 1 });
      await server.handleRequest(req);
      expect(handleSpy).not.toHaveBeenCalled();
    });
  });

  describe("non-PING interactions", () => {
    test("delegates to router.handle and returns 202", async () => {
      const router = new InteractionRouter();
      const postCalls: { path: string; body: unknown }[] = [];
      const rest = {
        post: (path: string, body: unknown) => {
          postCalls.push({ path, body });
          return Promise.resolve({});
        },
      };
      router.setRest(rest as any);
      router.command("ping", async (_interaction, response) => {
        await response.reply({ content: "Pong!" });
      });

      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: rest as any,
        router,
      });

      const interaction = {
        id: "1234567890",
        application_id: "app_id",
        type: 2,
        token: "tok",
        version: 1,
        data: { id: "cmd_id", name: "ping", type: 1 },
      };
      const req = await makeSignedRequest(interaction);
      const res = await server.handleRequest(req);
      expect(res.status).toBe(202);
      expect(postCalls).toHaveLength(1);
      expect(postCalls[0]?.path).toContain("/interactions/1234567890/tok/callback");
    });

    test("returns 500 when router throws", async () => {
      const router = new InteractionRouter();
      const rest = { post: () => Promise.reject(new Error("boom")) };
      router.setRest(rest as any);

      const server = new InteractionServer({
        publicKey: PUBLIC_KEY_HEX,
        rest: rest as any,
        router,
      });

      const interaction = {
        id: "x",
        application_id: "y",
        type: 2,
        token: "z",
        version: 1,
        data: { name: "will_throw", type: 1 },
      };
      router.command("will_throw", async () => {
        throw new Error("intentional");
      });

      const req = await makeSignedRequest(interaction);
      const res = await server.handleRequest(req);
      expect(res.status).toBe(500);
    });
  });
});
