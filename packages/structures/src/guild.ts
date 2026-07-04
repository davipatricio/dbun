import { BaseStructure } from "./base.js";
import type {
  APIGuild,
  APIGuildMember,
  APIChannel,
  APIRole,
  APIEmoji,
  APIBan,
  APIVoiceState,
  APIThreadList,
  GuildFeature,
} from "@dbun/types";
import { GuildMember } from "./member.js";
import { Channel } from "./channel.js";
import { Thread } from "./thread.js";
import { ThreadMember } from "./thread-member.js";
import { Role } from "./role.js";
import { Emoji } from "./emoji.js";
import { Ban } from "./ban.js";
import { VoiceState } from "./voice.js";

export class Guild extends BaseStructure<APIGuild> {
  get name(): string {
    return this.data.name;
  }

  get icon(): string | null {
    return this.data.icon;
  }

  get ownerId(): string {
    return this.data.owner_id;
  }

  get memberCount(): number | undefined {
    return this.data.approximate_member_count;
  }

  getFeatures(): GuildFeature[] {
    return this.data.features;
  }

  hasFeature(feature: GuildFeature): boolean {
    return this.data.features.includes(feature);
  }

  get members() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.members;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(userId: string): Promise<GuildMember | null> {
        const cached: GuildMember | null = await cache.get(`${guildId}:${userId}`);
        if (cached) return cached;
        const data = await rest.get<APIGuildMember>(`/guilds/${guildId}/members/${userId}`);
        if (!data) return null;
        await cache.add(`${guildId}:${userId}`, data);
        return cache.get(`${guildId}:${userId}`);
      },
    };
  }

  get channels() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.channels;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(channelId: string): Promise<Channel | null> {
        const cached: Channel | null = await cache.get(channelId);
        if (cached && cached.guildId === guildId) return cached;
        const data = await rest.get<APIChannel>(`/channels/${channelId}`);
        if (!data || !("guild_id" in data) || data.guild_id !== guildId) return null;
        await cache.add(channelId, data);
        return cache.get(channelId);
      },
      async list(): Promise<Channel[]> {
        const data = await rest.get<APIChannel[]>(`/guilds/${guildId}/channels`);
        const result: Channel[] = [];
        for (const ch of data) {
          await cache.add(ch.id, ch);
          result.push((await cache.get(ch.id))!);
        }
        return result;
      },
    };
  }

  get threads() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const rest = ctx.rest;
    const channelCache = ctx.cache.channels;
    const threadCache = ctx.cache.threads;
    const threadMembersCache = ctx.cache.threadMembers;
    return {
      async listActive(): Promise<{
        threads: Thread[];
        members: ThreadMember[];
      }> {
        const data = await rest.get<APIThreadList>(`/guilds/${guildId}/threads`);
        for (const thread of data.threads) {
          await channelCache.add(thread.id, thread);
          await threadCache.add(thread.id, thread);
        }
        for (const member of data.members) {
          await threadMembersCache.add(member.user_id!, member);
        }
        return {
          threads: await Promise.all(
            data.threads.map((t) => threadCache.get(t.id)),
          ),
          members: await Promise.all(
            data.members.map((m) => threadMembersCache.get(m.user_id!)),
          ),
        };
      },
    };
  }

  get roles() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.roles;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(roleId: string): Promise<Role | null> {
        const key = `${guildId}:${roleId}`;
        const cached: Role | null = await cache.get(key);
        if (cached) return cached;
        const roles = await rest.get<APIRole[]>(`/guilds/${guildId}/roles`);
        const data = roles?.find((r) => r.id === roleId);
        if (!data) return null;
        await cache.add(key, data);
        return cache.get(key);
      },
    };
  }

  get emojis() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.emojis;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(emojiId: string): Promise<Emoji | null> {
        const key = `${guildId}:${emojiId}`;
        const cached: Emoji | null = await cache.get(key);
        if (cached) return cached;
        const data = await rest.get<APIEmoji>(`/guilds/${guildId}/emojis/${emojiId}`);
        if (!data) return null;
        await cache.add(key, data);
        return cache.get(key);
      },
    };
  }

  get bans() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.bans;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(userId: string): Promise<Ban | null> {
        const key = `${guildId}:${userId}`;
        const cached: Ban | null = await cache.get(key);
        if (cached) return cached;
        const data = await rest.get<APIBan>(`/guilds/${guildId}/bans/${userId}`);
        if (!data) return null;
        await cache.add(key, data);
        return cache.get(key);
      },
    };
  }

  get voiceStates() {
    const ctx = this.context;
    if (!ctx) throw new Error("Guild not bound to client context");
    const guildId = this.id;
    const cache = ctx.cache.voiceStates;
    return {
      cache,
      async get(userId: string): Promise<VoiceState | null> {
        const key = `${guildId}:${userId}`;
        const cached: VoiceState | null = await cache.get(key);
        if (cached) return cached;
        return null;
      },
    };
  }
}
