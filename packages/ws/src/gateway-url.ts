import type { APIGatewayBotInfo } from "@dbun/types";

const DEFAULT_GATEWAY_URL = "wss://gateway.discord.gg";

export interface GatewayUrlOptions {
  version?: number;
  encoding?: "json" | "etf";
  compress?: "zlib-stream" | "zstd-stream";
}

export function buildGatewayUrl(options?: GatewayUrlOptions): string {
  const version = options?.version ?? 10;
  const encoding = options?.encoding ?? "json";
  const params = new URLSearchParams({ v: String(version), encoding });
  if (options?.compress) {
    params.set("compress", options.compress);
  }
  return `${DEFAULT_GATEWAY_URL}?${params}`;
}

export async function fetchGatewayUrl(token: string, options?: GatewayUrlOptions): Promise<string> {
  const response = await fetch("https://discord.com/api/v10/gateway/bot", {
    headers: { Authorization: `Bot ${token}` },
  });

  let baseUrl = DEFAULT_GATEWAY_URL;
  if (response.ok) {
    const data = (await response.json()) as APIGatewayBotInfo;
    baseUrl = data.url;
  }

  const version = options?.version ?? 10;
  const encoding = options?.encoding ?? "json";
  const params = new URLSearchParams({ v: String(version), encoding });
  if (options?.compress) {
    params.set("compress", options.compress);
  }
  return `${baseUrl}?${params}`;
}

export async function fetchGatewayInfo(token: string): Promise<APIGatewayBotInfo> {
  const response = await fetch("https://discord.com/api/v10/gateway/bot", {
    headers: { Authorization: `Bot ${token}` },
  });

  if (!response.ok) {
    return {
      url: "wss://gateway.discord.gg",
      shards: 1,
      session_start_limit: {
        total: 1000,
        remaining: 1000,
        reset_after: 0,
        max_concurrency: 1,
      },
    };
  }

  return (await response.json()) as APIGatewayBotInfo;
}
