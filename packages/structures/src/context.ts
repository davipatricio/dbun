import type { HydratingCache } from "@dbun/cache";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCache = HydratingCache<any>;

export interface ClientContext {
  rest: {
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    put<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T = void>(path: string): Promise<T>;
  };
  cache: {
    guilds: AnyCache;
    channels: AnyCache;
    threads: AnyCache;
    messages: AnyCache;
    users: AnyCache;
    members: AnyCache;
    roles: AnyCache;
    emojis: AnyCache;
    voiceStates: AnyCache;
    bans: AnyCache;
    threadMembers: AnyCache;
  };
}
