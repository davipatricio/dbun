import { describe, test, expect } from "bun:test";
import { encode, decode } from "../codec.js";

describe("codec", () => {
  describe("JSON encoding", () => {
    test("round-trips simple object", () => {
      const data = { op: 1, d: 42, t: "TEST" };
      const encoded = encode(data, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toEqual(data);
    });

    test("round-trips string", () => {
      const data = "hello world";
      const encoded = encode(data, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toBe(data);
    });

    test("round-trips number", () => {
      const encoded = encode(123, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toBe(123);
    });

    test("round-trips null", () => {
      const encoded = encode(null, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toBeNull();
    });

    test("round-trips array", () => {
      const data = [1, "two", { three: 3 }];
      const encoded = encode(data, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toEqual(data);
    });

    test("round-trips nested object", () => {
      const data = { a: { b: { c: [1, 2, 3] } } };
      const encoded = encode(data, "json");
      const decoded = decode(encoded, "json");
      expect(decoded).toEqual(data);
    });
  });

  describe("ETF encoding", () => {
    test("round-trips small integer", () => {
      const data = { op: 1 };
      const encoded = encode(data, "etf");
      expect(encoded).toBeInstanceOf(Buffer);
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips string", () => {
      const data = { t: "HELLO" };
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips array", () => {
      const data = [1, 2, 3];
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips nested object", () => {
      const data = { op: 0, d: { items: [1, "two", { x: true }] } };
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips boolean atoms", () => {
      const data = { a: true, b: false };
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips null as nil atom", () => {
      const data = { x: null };
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("starts with ETF version byte (131)", () => {
      const encoded = encode({ op: 1 }, "etf") as Buffer;
      expect(encoded[0]).toBe(131);
    });

    test("throws on invalid version byte", () => {
      const buf = Buffer.from([0, 1, 2, 3]);
      expect(() => decode(buf, "etf")).toThrow("Invalid ETF version");
    });

    test("round-trips large integer", () => {
      const data = { val: 100000 };
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips empty object", () => {
      const data = {};
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });

    test("round-trips empty array", () => {
      const data: unknown[] = [];
      const encoded = encode(data, "etf");
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual(data);
    });
  });

  describe("Buffer handling", () => {
    test("ETF decode accepts Buffer input", () => {
      const encoded = encode({ op: 1 }, "etf") as Buffer;
      const decoded = decode(encoded, "etf");
      expect(decoded).toEqual({ op: 1 });
    });

    test("JSON decode accepts Buffer input", () => {
      const encoded = Buffer.from(JSON.stringify({ x: 1 }));
      const decoded = decode(encoded, "json");
      expect(decoded).toEqual({ x: 1 });
    });

    test("JSON decode accepts string input", () => {
      const decoded = decode('{"x":1}', "json");
      expect(decoded).toEqual({ x: 1 });
    });
  });
});
