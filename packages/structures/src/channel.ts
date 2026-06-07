import { BaseStructure } from "./base.js";
import { Message } from "./message.js";
import type { APIChannel, APIMessage } from "@dbun/types";

export class Channel extends BaseStructure<APIChannel> {
  get type(): number {
    return this.data.type;
  }

  get name(): string | null | undefined {
    return this.data.name;
  }

  get guildId(): string | undefined {
    return "guild_id" in this.data ? this.data.guild_id : undefined;
  }

  get parentId(): string | null | undefined {
    return "parent_id" in this.data ? this.data.parent_id : undefined;
  }

  get lastMessageId(): string | null | undefined {
    return "last_message_id" in this.data ? this.data.last_message_id : undefined;
  }

  isText(): boolean {
    return this.data.type === 0 || this.data.type === 5;
  }

  isVoice(): boolean {
    return this.data.type === 2 || this.data.type === 13;
  }

  isThread(): boolean {
    return this.data.type === 10 || this.data.type === 11 || this.data.type === 12;
  }

  get messages() {
    const ctx = this.context;
    if (!ctx) throw new Error("Channel not bound to client context");
    const channelId = this.id;
    const cache = ctx.cache.messages;
    const rest = ctx.rest;
    return {
      cache,
      async fetch(messageId: string): Promise<Message | null> {
        const cached = await cache.get<APIMessage>(messageId);
        if (cached && cached.channel_id === channelId) return new Message(cached, ctx);
        const data = await rest.get<APIMessage>(`/channels/${channelId}/messages/${messageId}`);
        if (!data) return null;
        await cache.set(messageId, data, "messages");
        return new Message(data, ctx);
      },
      async send(content: string | { content?: string; embeds?: unknown[] }): Promise<Message> {
        const body = typeof content === "string" ? { content } : content;
        const data = await rest.post<APIMessage>(`/channels/${channelId}/messages`, body);
        await cache.set(data.id, data, "messages");
        return new Message(data, ctx);
      },
    };
  }
}
