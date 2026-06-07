import { describe, test, expect } from "bun:test";
import { buildGatewayUrl } from "../gateway-url.js";

describe("buildGatewayUrl", () => {
  test("returns default URL with json encoding and v10", () => {
    const url = buildGatewayUrl();
    expect(url).toBe("wss://gateway.discord.gg?v=10&encoding=json");
  });

  test("uses custom version", () => {
    const url = buildGatewayUrl({ version: 9 });
    expect(url).toContain("v=9");
  });

  test("uses etf encoding", () => {
    const url = buildGatewayUrl({ encoding: "etf" });
    expect(url).toContain("encoding=etf");
  });

  test("includes zlib-stream compression", () => {
    const url = buildGatewayUrl({ compress: "zlib-stream" });
    expect(url).toContain("compress=zlib-stream");
  });

  test("includes zstd-stream compression", () => {
    const url = buildGatewayUrl({ compress: "zstd-stream" });
    expect(url).toContain("compress=zstd-stream");
  });

  test("omits compress when not specified", () => {
    const url = buildGatewayUrl();
    expect(url).not.toContain("compress");
  });

  test("combines all options", () => {
    const url = buildGatewayUrl({ version: 8, encoding: "etf", compress: "zstd-stream" });
    expect(url).toBe("wss://gateway.discord.gg?v=8&encoding=etf&compress=zstd-stream");
  });

  test("always starts with wss://gateway.discord.gg", () => {
    const url = buildGatewayUrl();
    expect(url.startsWith("wss://gateway.discord.gg")).toBe(true);
  });
});
