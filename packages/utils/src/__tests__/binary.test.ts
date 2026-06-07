import { describe, test, expect } from "bun:test";
import { toHex, fromHex } from "../binary.js";

describe("binary", () => {
  describe("toHex", () => {
    test("converts buffer to hex string", () => {
      const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer;
      expect(toHex(buf)).toBe("deadbeef");
    });

    test("converts empty buffer to empty string", () => {
      const buf = new ArrayBuffer(0);
      expect(toHex(buf)).toBe("");
    });

    test("pads single-digit hex values", () => {
      const buf = new Uint8Array([0x00, 0x01, 0x0f]).buffer;
      expect(toHex(buf)).toBe("00010f");
    });

    test("handles max byte value", () => {
      const buf = new Uint8Array([0xff]).buffer;
      expect(toHex(buf)).toBe("ff");
    });
  });

  describe("fromHex", () => {
    test("converts hex string to buffer", () => {
      const result = fromHex("deadbeef");
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(4);
      expect([...result]).toEqual([0xde, 0xad, 0xbe, 0xef]);
    });

    test("returns empty array for empty string", () => {
      const result = fromHex("");
      expect(result.length).toBe(0);
    });

    test("handles uppercase hex", () => {
      const result = fromHex("DEADBEEF");
      expect([...result]).toEqual([0xde, 0xad, 0xbe, 0xef]);
    });

    test("handles single byte", () => {
      const result = fromHex("ff");
      expect(result.length).toBe(1);
      expect(result[0]).toBe(255);
    });
  });

  describe("round-trip", () => {
    test("fromHex(toHex(buf)) equals original", () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const hex = toHex(original);
      const recovered = fromHex(hex);
      expect([...new Uint8Array(recovered)]).toEqual([...new Uint8Array(original)]);
    });

    test("fromHex(toHex(empty)) equals empty", () => {
      const original = new ArrayBuffer(0);
      const hex = toHex(original);
      const recovered = fromHex(hex);
      expect(recovered.length).toBe(0);
    });
  });
});
