import { describe, test, expect } from "bun:test";
import { snowflakeToTimestamp, timestampToSnowflake, calculateShardId, DISCORD_EPOCH } from "../snowflake.js";

describe("snowflake", () => {
  describe("snowflakeToTimestamp", () => {
    test("converts a known snowflake to its timestamp", () => {
      const snowflake = "4294967296";
      const timestamp = snowflakeToTimestamp(snowflake);
      const offset = Number(BigInt(snowflake) >> 22n);
      expect(timestamp).toBe(DISCORD_EPOCH + offset);
    });

    test("returns DISCORD_EPOCH for snowflake with only timestamp bits", () => {
      const snowflake = "0";
      const timestamp = snowflakeToTimestamp(snowflake);
      expect(timestamp).toBe(DISCORD_EPOCH);
    });

    test("handles large snowflakes", () => {
      const snowflake = "123456789012345678";
      const timestamp = snowflakeToTimestamp(snowflake);
      expect(timestamp).toBeGreaterThan(DISCORD_EPOCH);
      expect(typeof timestamp).toBe("number");
    });
  });

  describe("timestampToSnowflake", () => {
    test("converts a timestamp to snowflake string", () => {
      const timestamp = DISCORD_EPOCH + 1;
      const snowflake = timestampToSnowflake(timestamp);
      expect(typeof snowflake).toBe("string");
      expect(BigInt(snowflake)).toBeGreaterThanOrEqual(0n);
    });

    test("round-trips with snowflakeToTimestamp", () => {
      const originalTimestamp = DISCORD_EPOCH + 1000000;
      const snowflake = timestampToSnowflake(originalTimestamp);
      const recovered = snowflakeToTimestamp(snowflake);
      expect(recovered).toBe(originalTimestamp);
    });
  });

  describe("calculateShardId", () => {
    test("returns a number within shard range", () => {
      const guildId = "123456789012345678";
      const numShards = 16;
      const shardId = calculateShardId(guildId, numShards);
      expect(shardId).toBeGreaterThanOrEqual(0);
      expect(shardId).toBeLessThan(numShards);
    });

    test("is deterministic for same inputs", () => {
      const guildId = "987654321012345678";
      const numShards = 4;
      const first = calculateShardId(guildId, numShards);
      const second = calculateShardId(guildId, numShards);
      expect(first).toBe(second);
    });

    test("single shard always returns 0", () => {
      const shardId = calculateShardId("123456789012345678", 1);
      expect(shardId).toBe(0);
    });
  });
});
