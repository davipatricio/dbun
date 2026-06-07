import { Client, Intents } from "@dbun/client";
import { workerThreadsAdapter } from "@dbun/ipc";

const adapter = await workerThreadsAdapter({
  workerScript: new URL("./worker-entry.ts", import.meta.url).pathname,
});

const client = new Client({
  token: process.env.DISCORD_TOKEN!,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
  ipc: {
    mode: "coordinator",
    adapter,
    totalShards: 4,
    assignment: "auto",
  },
});

client.on("ready", () => {
  console.log("[coordinator] All shards connected, bot is ready");
});

client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    console.log(`[coordinator] Pong!`);
  }
});

client.on("debug", (msg) => {
  console.log(`[debug] ${msg}`);
});

await client.login();
