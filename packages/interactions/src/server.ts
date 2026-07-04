import type { RESTClient } from "@dbun/rest";
import { InteractionType } from "@dbun/types";
import { InteractionRouter } from "./handler.js";

export interface InteractionServerOptions {
  publicKey: string;
  rest: RESTClient;
  router: InteractionRouter;
}

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

async function verifySignature(
  publicKeyStr: string,
  signature: string,
  timestamp: string,
  bodyStr: string,
): Promise<boolean> {
  const keyData = hexToUint8Array(publicKeyStr);
  const sigData = hexToUint8Array(signature);
  const enc = new TextEncoder();
  const tsBytes = enc.encode(timestamp);
  const bodyBytes = enc.encode(bodyStr);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer,
    { name: "Ed25519" },
    false,
    ["verify"],
  );

  const combined = concatUint8Arrays(tsBytes, bodyBytes);

  return crypto.subtle.verify(
    { name: "Ed25519" },
    key,
    sigData.buffer,
    combined.buffer,
  );
}

export class InteractionServer {
  private publicKey: string;
  private rest: RESTClient;
  private router: InteractionRouter;

  constructor(options: InteractionServerOptions) {
    this.publicKey = options.publicKey;
    this.rest = options.rest;
    this.router = options.router;
  }

  async handleRequest(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");

    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 401 });
    }

    const body = await request.text();

    const isValid = await verifySignature(this.publicKey, signature, timestamp, body);
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const interaction = JSON.parse(body);

    if (interaction.type === InteractionType.Ping) {
      return Response.json({ type: InteractionType.Ping });
    }

    try {
      await this.router.handle(interaction);
    } catch (err) {
      console.error("[InteractionServer] error handling interaction:", err);
      return new Response("Internal server error", { status: 500 });
    }

    return new Response(null, { status: 202 });
  }

  serve(port: number): ReturnType<typeof Bun.serve> {
    return Bun.serve({
      port,
      fetch: (req) => this.handleRequest(req),
    });
  }
}
