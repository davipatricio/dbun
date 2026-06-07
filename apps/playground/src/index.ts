import { Client, Intents } from "@dbun/client";

const client = new Client({
  token: process.env.DISCORD_TOKEN!,
  intents: [Intents.Flags.Guilds, Intents.Flags.GuildMessages],
  observability: {
    enabled: true,
  },
});

client.on("ready", () => {
  console.log("Logged in as", client.token ? "bot" : "unknown");
});

client.interactions.command("ping", async (_interaction) => {
  console.log("Ping received!");
});

console.log("Logging in...");
await client.login();
