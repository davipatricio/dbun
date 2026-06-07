import { BaseStructure } from "./base.js";
import type {
  APIGuild,
  APIGuildMember,
  APIChannel,
  APIRole,
  APIEmoji,
  APIBan,
  APIVoiceState,
  GuildFeature,
} from "@dbun/types";
import { GuildMember } from "./member.js";
import { Channel } from "./channel.js";
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
        const cached = await cache.get<APIGuildMember>(`${guildId}:${userId}`);
        if (cached) return new GuildMember(cached, ctx);
        const data = await rest.get<APIGuildMember>(`/guilds/${guildId}/members/${userId}`);
        if (!data) return null;
        await cache.set(`${guildId}:${userId}`, data, "members");
        return new GuildMember(data, ctx);
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
        const cached = await cache.get<APIChannel>(channelId);
        if (cached && "guild_id" in cached && cached.guild_id === guildId) {
          return new Channel(cached, ctx);
        }
        const data = await rest.get<APIChannel>(`/channels/${channelId}`);
        if (!data || !("guild_id" in data) || data.guild_id !== guildId) return null;
        await cache.set(channelId, data, "channels");
        return new Channel(data, ctx);
      },
      async list(): Promise<Channel[]> {
        const data = await rest.get<APIChannel[]>(`/guilds/${guildId}/channels`);
        const result: Channel[] = [];
        for (const ch of data) {
          await cache.set(ch.id, ch, "channels");
          result.push(new Channel(ch, ctx));
        }
        return result;
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
        const cached = await cache.get<APIRole>(`${guildId}:${roleId}`);
        if (cached) return new Role(cached, ctx);
        const roles = await rest.get<APIRole[]>(`/guilds/${guildId}/roles`);
        const data = roles?.find((r) => r.id === roleId);
        if (!data) return null;
        await cache.set(`${guildId}:${roleId}`, data, "roles");
        return new Role(data, ctx);
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
        const cached = await cache.get<APIEmoji>(`${guildId}:${emojiId}`);
        if (cached) return new Emoji(cached, ctx);
        const data = await rest.get<APIEmoji>(`/guilds/${guildId}/emojis/${emojiId}`);
        if (!data) return null;
        await cache.set(`${guildId}:${emojiId}`, data, "emojis");
        return new Emoji(data, ctx);
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
        const cached = await cache.get<APIBan>(`${guildId}:${userId}`);
        if (cached) return new Ban(cached, ctx);
        const data = await rest.get<APIBan>(`/guilds/${guildId}/bans/${userId}`);
        if (!data) return null;
        await cache.set(`${guildId}:${userId}`, data, "bans");
        return new Ban(data, ctx);
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
        const cached = await cache.get<APIVoiceState>(`${guildId}:${userId}`);
        if (cached) return new VoiceState(cached, ctx);
        return null;
      },
    };
  }
}
