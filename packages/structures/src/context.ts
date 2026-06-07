import type { CacheManager } from "@dbun/cache";

export interface ClientContext {
  rest: {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T = void>(path: string): Promise<T>;
  };
  cache: {
    guilds: CacheManager;
    channels: CacheManager;
    messages: CacheManager;
    users: CacheManager;
    members: CacheManager;
    roles: CacheManager;
    emojis: CacheManager;
    voiceStates: CacheManager;
    bans: CacheManager;
  };
}
