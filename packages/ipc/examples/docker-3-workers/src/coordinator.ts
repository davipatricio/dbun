import { Client } from "@dbun/client";
import { GatewayIntentBits } from "@dbun/types";
import { redisPubSubAdapter } from "@dbun/ipc";

const adapter = await redisPubSubAdapter({
  url: process.env.REDIS_URL ?? "redis://redis:6379",
});

const client = new Client({
  token: process.env.DISCORD_TOKEN!,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  ipc: {
    mode: "coordinator",
    adapter,
    totalShards: "auto",
    assignment: "auto",
  },
});

client.on("ready", () => {
  console.log("[coordinator] All shards connected, bot is ready");
});

client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    console.log(`[coordinator] Pong! (shard event received)`);
  }
});

client.on("debug", (msg) => {
  console.log(`[coordinator:debug] ${msg}`);
});

client.on("error", (err) => {
  console.error(`[coordinator:error]`, err);
});

await client.login();
console.log("[coordinator] Started, waiting for workers...");
