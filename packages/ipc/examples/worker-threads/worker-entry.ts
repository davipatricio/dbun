import { Worker, workerThreadsAdapter } from "@dbun/ipc";
import { Intents } from "@dbun/types";

const adapter = await workerThreadsAdapter({
  workerScript: "",
  isCoordinator: false,
});

const worker = new Worker({
  adapter,
  workerId: `worker-${process.pid}`,
  token: process.env.DISCORD_TOKEN!,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
});

worker.on("assigned", (range) => {
  console.log(`[worker] Assigned shards ${range.start}-${range.end}`);
});

worker.on("shard:ready", (shardId) => {
  console.log(`[worker] Shard ${shardId} connected`);
});

worker.on("debug", (msg) => {
  console.log(`[worker:debug] ${msg}`);
});

await worker.start();
