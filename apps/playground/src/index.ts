import { Client, Intents } from "@dbun/client";

const client = new Client({
  token: process.env.DISCORD_TOKEN!,
  intents: [Intents.Flags.Guilds, Intents.Flags.GuildMessages, Intents.Flags.DirectMessages, Intents.Flags.MessageContent],
  observability: {
    enabled: true,
  },
  encoding: "json",
  compress: false,
});

client.on("ready", () => {
  console.log("Logged in as", client.token ? "bot" : "unknown");
});

client.on("MESSAGE_CREATE", (msg) => {
  console.log("Message created:", msg.content);
});

client.interactions.command("ping", async (_interaction) => {
  console.log("Ping received!");
});

console.log("Logging in...");
await client.login();
