import { Worker, redisPubSubAdapter } from "@dbun/ipc";
import { GatewayIntentBits } from "@dbun/types";

const intents = GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent;

const worker = new Worker({
  adapter: await redisPubSubAdapter({
    url: process.env.REDIS_URL ?? "redis://redis:6379",
  }),
  workerId: process.env.WORKER_ID ?? `worker-${process.pid}`,
  token: process.env.DISCORD_TOKEN!,
  intents,
});

worker.on("assigned", (range) => {
  console.log(
    `[${worker.workerId}] Assigned shards ${range.start}-${range.end}`,
  );
});

worker.on("revoked", (range) => {
  console.log(
    `[${worker.workerId}] Revoked shards ${range.start}-${range.end}`,
  );
});

worker.on("shard:ready", (shardId: number) => {
  console.log(`[${worker.workerId}] Shard ${shardId} connected`);
});

worker.on(
  "shard:event",
  (shardId: number, event: string, _data: unknown) => {
    console.log(`[${worker.workerId}] Shard ${shardId} event: ${event}`);
  },
);

worker.on("shard:error", (shardId: number, error: unknown) => {
  console.error(`[${worker.workerId}] Shard ${shardId} error:`, error);
});

worker.on("debug", (msg: string) => {
  console.log(`[${worker.workerId}:debug] ${msg}`);
});

await worker.start();
console.log(`[${worker.workerId}] Started, waiting for shard assignment...`);
