import { describe, test, expect } from "bun:test";
import { normalizeCompressionMode, isCompressionMode, createDecompressor } from "../compression.js";

describe("normalizeCompressionMode", () => {
  test("keeps real compression modes unchanged", () => {
    expect(normalizeCompressionMode("zlib-stream")).toBe("zlib-stream");
    expect(normalizeCompressionMode("zstd-stream")).toBe("zstd-stream");
    expect(normalizeCompressionMode("zlib-payload")).toBe("zlib-payload");
  });

  test("normalizes null to null", () => {
    expect(normalizeCompressionMode(null)).toBe(null);
  });

  test("normalizes false to null", () => {
    expect(normalizeCompressionMode(false)).toBe(null);
  });

  test("normalizes 'none' to null", () => {
    expect(normalizeCompressionMode("none")).toBe(null);
  });
});

describe("isCompressionMode", () => {
  test("returns true for valid values", () => {
    expect(isCompressionMode(null)).toBe(true);
    expect(isCompressionMode(false)).toBe(true);
    expect(isCompressionMode("none")).toBe(true);
    expect(isCompressionMode("zlib-stream")).toBe(true);
    expect(isCompressionMode("zstd-stream")).toBe(true);
    expect(isCompressionMode("zlib-payload")).toBe(true);
  });

  test("returns false for invalid values", () => {
    expect(isCompressionMode("gzip")).toBe(false);
    expect(isCompressionMode(true)).toBe(false);
    expect(isCompressionMode(0)).toBe(false);
    expect(isCompressionMode({})).toBe(false);
    expect(isCompressionMode(undefined)).toBe(false);
  });
});

describe("createDecompressor", () => {
  test("returns null for no-compression values", () => {
    expect(createDecompressor(null)).toBeNull();
    expect(createDecompressor(false)).toBeNull();
    expect(createDecompressor("none")).toBeNull();
  });

  test("returns decompressor for compression values", () => {
    expect(createDecompressor("zlib-stream")).not.toBeNull();
    expect(createDecompressor("zstd-stream")).not.toBeNull();
    expect(createDecompressor("zlib-payload")).not.toBeNull();
  });
});
