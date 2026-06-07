import type { Snowflake } from "discord-api-types/v10";

export const DISCORD_EPOCH = 1420070400000;

export function snowflakeToTimestamp(snowflake: Snowflake): number {
  return Number(BigInt(snowflake) >> 22n) + DISCORD_EPOCH;
}

export function timestampToSnowflake(timestamp: number): Snowflake {
  return String(BigInt(timestamp - DISCORD_EPOCH) << 22n);
}

export function calculateShardId(guildId: Snowflake, numShards: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(numShards));
}
