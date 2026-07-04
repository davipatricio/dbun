import type {
  GatewayReceivePayload,
  GatewayHelloData,
  GatewayReadyDispatchData,
  GatewaySendPayload,
} from "@dbun/types";
import { GatewayCloseCodes, GatewayOpcodes } from "@dbun/types";
import { HeartbeatManager } from "./heartbeat.js";
import {
  type Decompressor,
  createDecompressor,
  type CompressionMode,
  normalizeCompressionMode,
} from "./compression.js";
import { encode, decode, type EncodingMode } from "./codec.js";
import type { GatewayUrlOptions } from "./gateway-url.js";

export interface ShardOptions {
  token: string;
  intents: number;
  shardId: number;
  totalShards: number;
  presence?: unknown;
  encoding?: EncodingMode;
  compress?: CompressionMode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

const NON_RESUMABLE_CODES = new Set([
  GatewayCloseCodes.AuthenticationFailed,
  GatewayCloseCodes.InvalidShard,
  GatewayCloseCodes.ShardingRequired,
  GatewayCloseCodes.InvalidAPIVersion,
  GatewayCloseCodes.InvalidIntents,
  GatewayCloseCodes.DisallowedIntents,
]);

export class Shard {
  private ws: WebSocket | null = null;
  private heartbeat: HeartbeatManager;
  private sequence: number | null = null;
  private sessionId: string | null = null;
  private resumeGatewayUrl: string | null = null;
  private gatewayUrl: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private handlers = new Map<string, Set<EventHandler>>();
  private connected = false;
  private decompressor: Decompressor | null;
  private payloadDecompressor: Decompressor | null;
  private encoding: EncodingMode;
  private compress: CompressionMode;
  private identifyCompress: boolean;

  readonly shardId: number;
  readonly totalShards: number;
  readonly token: string;
  readonly intents: number;
  readonly presence?: unknown;

  constructor(options: ShardOptions) {
    this.token = options.token;
    this.intents = options.intents;
    this.shardId = options.shardId;
    this.totalShards = options.totalShards;
    this.presence = options.presence;
    this.encoding = options.encoding ?? "json";
    this.compress = normalizeCompressionMode(options.compress ?? null);
    this.decompressor =
      this.compress === "zlib-stream" || this.compress === "zstd-stream"
        ? createDecompressor(this.compress)
        : null;
    this.payloadDecompressor =
      this.compress === "zlib-payload" ? createDecompressor("zlib-payload") : null;
    this.identifyCompress = this.payloadDecompressor !== null;
    this.heartbeat = new HeartbeatManager((msg) => this.emit("debug", msg));
  }

  on(event: string, handler: EventHandler): this {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch {
        /* ignore handler errors */
      }
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(url?: string): Promise<void> {
    if (!url) {
      const { fetchGatewayUrl } = await import("./gateway-url.js");
      const opts: GatewayUrlOptions = {
        encoding: this.encoding,
        compress:
          this.compress === "zlib-stream" || this.compress === "zstd-stream"
            ? this.compress
            : undefined,
      };
      url = await fetchGatewayUrl(this.token, opts);
    }

    this.gatewayUrl = url;
    this.connected = true;
    this.decompressor?.reset();
    this.payloadDecompressor?.reset();
    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.emit(
        "debug",
        `Shard ${this.shardId} connected (encoding=${this.encoding}, compress=${this.compress ?? "none"})`,
      );
    });

    this.ws.addEventListener("message", (event) => {
      this.handleRawMessage(event.data);
    });

    this.ws.addEventListener("close", (event) => {
      this.heartbeat.stop();
      this.connected = false;
      this.handleClose(event.code, event.reason);
    });

    this.ws.addEventListener("error", () => {
      this.emit("debug", `Shard ${this.shardId} WebSocket error`);
    });
  }

  private handleRawMessage(raw: unknown): void {
    let parsed: GatewayReceivePayload;

    if (this.encoding === "etf") {
      const buf =
        raw instanceof ArrayBuffer
          ? Buffer.from(raw)
          : typeof raw === "string"
            ? Buffer.from(raw)
            : (raw as Buffer);
      parsed = decode(buf, "etf") as GatewayReceivePayload;
    } else {
      const buf =
        raw instanceof ArrayBuffer
          ? Buffer.from(raw)
          : typeof raw === "string"
            ? Buffer.from(raw)
            : (raw as Buffer);
      const decompressor = this.decompressor ?? this.payloadDecompressor;
      if (decompressor) {
        const decompressed = decompressor.decompress(buf);
        if (decompressed.length === 0) return;
        parsed = JSON.parse(decompressed.toString()) as GatewayReceivePayload;
      } else {
        parsed = JSON.parse(buf.toString()) as GatewayReceivePayload;
      }
    }

    this.handleMessage(parsed);
  }

  private handleMessage(payload: GatewayReceivePayload): void {
    const { op, d, s, t } = payload;

    if (s !== null) {
      this.sequence = s;
    }

    switch (op) {
      case GatewayOpcodes.Hello: {
        const hello = d as GatewayHelloData;
        this.heartbeat.start(hello.heartbeat_interval, () => {
          this.send({
            op: GatewayOpcodes.Heartbeat,
            d: this.sequence,
          });
        });
        this.identify();
        break;
      }
      case GatewayOpcodes.Heartbeat: {
        this.send({
          op: GatewayOpcodes.Heartbeat,
          d: this.sequence,
        });
        break;
      }
      case GatewayOpcodes.HeartbeatAck: {
        this.heartbeat.ack();
        break;
      }
      case GatewayOpcodes.Dispatch: {
        if (t === "READY") {
          const ready = d as GatewayReadyDispatchData;
          this.sessionId = ready.session_id;
          this.resumeGatewayUrl = ready.resume_gateway_url;
          this.emit("ready");
        }
        this.emit("dispatch", t, d);
        this.emit(t!, d);
        break;
      }
      case GatewayOpcodes.Reconnect: {
        this.emit("debug", `Shard ${this.shardId} received reconnect request`);
        this.reconnect();
        break;
      }
      case GatewayOpcodes.InvalidSession: {
        this.emit("debug", `Shard ${this.shardId} invalid session (resumable: ${d})`);
        if (d === false) {
          this.sequence = null;
          this.sessionId = null;
        }
        setTimeout(
          () => {
            this.reconnect();
          },
          Math.random() * 5000 + 1000,
        );
        break;
      }
    }
  }

  private identify(): void {
    this.send({
      op: GatewayOpcodes.Identify,
      d: {
        token: this.token,
        intents: this.intents,
        compress: this.identifyCompress,
        properties: {
          os: "linux",
          browser: "dbun",
          device: "dbun",
        },
        shard: [this.shardId, this.totalShards],
      },
    });
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("debug", `Shard ${this.shardId} max reconnect attempts reached`);
      this.emit(
        "error",
        new Error(
          `Shard ${this.shardId} failed to reconnect after ${this.maxReconnectAttempts} attempts`,
        ),
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

    this.emit(
      "debug",
      `Shard ${this.shardId} reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      if (this.sessionId && this.resumeGatewayUrl) {
        this.resume();
      } else {
        this.connect(this.gatewayUrl!);
      }
    }, delay);
  }

  private resume(): void {
    const url = this.resumeGatewayUrl!;
    this.emit("debug", `Shard ${this.shardId} resuming on ${url}`);

    this.connected = true;
    this.decompressor?.reset();
    this.payloadDecompressor?.reset();
    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.send({
        op: GatewayOpcodes.Resume,
        d: {
          token: this.token,
          session_id: this.sessionId!,
          seq: this.sequence!,
        },
      });
    });

    this.ws.addEventListener("message", (event) => {
      this.handleRawMessage(event.data);
    });

    this.ws.addEventListener("close", (event) => {
      this.heartbeat.stop();
      this.connected = false;
      this.handleClose(event.code, event.reason);
    });

    this.ws.addEventListener("error", () => {
      this.emit("debug", `Shard ${this.shardId} resume WebSocket error`);
    });
  }

  private handleClose(code: number, reason: string): void {
    this.emit("debug", `Shard ${this.shardId} disconnected: ${code} ${reason}`);
    this.emit("close", code, reason);

    if (code === 1000 || code === 1001) {
      return;
    }

    if (
      NON_RESUMABLE_CODES.has(code as (typeof GatewayCloseCodes)[keyof typeof GatewayCloseCodes])
    ) {
      if (code === GatewayCloseCodes.AuthenticationFailed) {
        this.emit("error", new Error(`Shard ${this.shardId} authentication failed`));
      } else if (code === GatewayCloseCodes.InvalidShard) {
        this.emit("error", new Error(`Shard ${this.shardId} invalid shard`));
      } else if (code === GatewayCloseCodes.ShardingRequired) {
        this.emit("error", new Error(`Shard ${this.shardId} sharding required`));
      } else if (code === GatewayCloseCodes.DisallowedIntents) {
        this.emit("error", new Error(`Shard ${this.shardId} disallowed intents`));
      } else if (code === GatewayCloseCodes.InvalidIntents) {
        this.emit("error", new Error(`Shard ${this.shardId} invalid intents`));
      }
      return;
    }

    if (code === GatewayCloseCodes.InvalidSeq) {
      this.sequence = null;
      this.sessionId = null;
    }

    this.reconnect();
  }

  private send(data: GatewaySendPayload): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const encoded = encode(data, this.encoding);
      this.ws.send(encoded);
    }
  }

  disconnect(): void {
    this.heartbeat.stop();
    this.connected = false;
    this.decompressor?.destroy();
    this.payloadDecompressor?.destroy();
    this.ws?.close(1000);
    this.ws = null;
  }
}
