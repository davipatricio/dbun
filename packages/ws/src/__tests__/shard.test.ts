import { describe, test, expect } from "bun:test";
import * as zlib from "node:zlib";
import { Shard } from "../shard.js";

function compressPayload(json: string): Buffer {
  return zlib.deflateSync(Buffer.from(json, "utf-8"));
}

describe("Shard compression", () => {
  describe("per-payload zlib (compress: 'zlib-payload')", () => {
    test("emits dispatch with decoded payload", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
        compress: "zlib-payload",
      });

      const dispatch = JSON.stringify({
        op: 0,
        s: 1,
        t: "READY",
        d: { session_id: "abc" },
      });
      const compressed = compressPayload(dispatch);

      const events: Array<{ name: string; data: unknown }> = [];
      shard.on("dispatch", (name, data) => events.push({ name, data }));
      shard.on("READY", (data) => events.push({ name: "READY-direct", data }));
      (shard as unknown as { handleRawMessage: (raw: unknown) => void }).handleRawMessage(
        compressed,
      );

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ name: "READY", data: { session_id: "abc" } });
      expect(events[1]).toEqual({ name: "READY-direct", data: { session_id: "abc" } });
    });

    test("sets identifyCompress to true", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
        compress: "zlib-payload",
      });
      expect((shard as unknown as { identifyCompress: boolean }).identifyCompress).toBe(true);
    });
  });

  describe("no compression (compress: null)", () => {
    test("parses raw JSON payloads", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
      });

      const events: string[] = [];
      shard.on("READY", () => events.push("READY"));
      (shard as unknown as { handleRawMessage: (raw: unknown) => void }).handleRawMessage(
        JSON.stringify({ op: 0, s: 1, t: "READY", d: { session_id: "abc" } }),
      );

      expect(events).toEqual(["READY"]);
    });

    test("sets identifyCompress to false (no auto per-payload compression)", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
      });
      expect((shard as unknown as { identifyCompress: boolean }).identifyCompress).toBe(false);
      expect((shard as unknown as { decompressor: unknown }).decompressor).toBeNull();
      expect((shard as unknown as { payloadDecompressor: unknown }).payloadDecompressor).toBeNull();
    });
  });

  describe("explicit no-compression values (compress: false | 'none')", () => {
    for (const value of [false, "none"] as const) {
      test(`treats ${String(value)} as no compression`, () => {
        const shard = new Shard({
          token: "test",
          intents: 0,
          shardId: 0,
          totalShards: 1,
          compress: value,
        });
        expect((shard as unknown as { compress: unknown }).compress).toBeNull();
        expect((shard as unknown as { identifyCompress: boolean }).identifyCompress).toBe(false);
        expect((shard as unknown as { decompressor: unknown }).decompressor).toBeNull();
        expect(
          (shard as unknown as { payloadDecompressor: unknown }).payloadDecompressor,
        ).toBeNull();
      });
    }
  });

  describe("transport compression (compress: 'zlib-stream' | 'zstd-stream')", () => {
    test("uses transport decompressor and skips per-payload decompressor", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
        compress: "zlib-stream",
      });
      expect((shard as unknown as { identifyCompress: boolean }).identifyCompress).toBe(false);
      expect((shard as unknown as { payloadDecompressor: unknown }).payloadDecompressor).toBeNull();
      expect((shard as unknown as { decompressor: unknown }).decompressor).not.toBeNull();
    });

    test("uses zstd transport decompressor when compress: 'zstd-stream'", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
        compress: "zstd-stream",
      });
      expect((shard as unknown as { decompressor: unknown }).decompressor).not.toBeNull();
    });
  });

  describe("encoding", () => {
    test("defaults to json", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
      });
      expect((shard as unknown as { encoding: string }).encoding).toBe("json");
    });

    test("honors explicit etf encoding", () => {
      const shard = new Shard({
        token: "test",
        intents: 0,
        shardId: 0,
        totalShards: 1,
        encoding: "etf",
      });
      expect((shard as unknown as { encoding: string }).encoding).toBe("etf");
    });
  });
});
