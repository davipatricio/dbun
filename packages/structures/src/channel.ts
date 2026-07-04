import { BaseStructure } from "./base.js";
import { Message } from "./message.js";
import type {
  APIChannel,
  APIMessage,
  APIThreadList,
  ThreadAutoArchiveDuration,
} from "@dbun/types";

let _Thread: typeof import("./thread.js").Thread | null = null;
let _ThreadMember: typeof import("./thread-member.js").ThreadMember | null = null;

async function getThread(): Promise<typeof import("./thread.js").Thread> {
  _Thread ??= (await import("./thread.js")).Thread;
  return _Thread;
}

async function getThreadMember(): Promise<
  typeof import("./thread-member.js").ThreadMember
> {
  _ThreadMember ??= (await import("./thread-member.js")).ThreadMember;
  return _ThreadMember;
}

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
        const cached: Message | null = await cache.get(messageId);
        if (cached && cached.channelId === channelId) return cached;
        const data = await rest.get<APIMessage>(`/channels/${channelId}/messages/${messageId}`);
        if (!data) return null;
        await cache.add(messageId, data);
        return cache.get(messageId);
      },
      async send(content: string | { content?: string; embeds?: unknown[] }): Promise<Message> {
        const body = typeof content === "string" ? { content } : content;
        const data = await rest.post<APIMessage>(`/channels/${channelId}/messages`, body);
        await cache.add(data.id, data);
        return (await cache.get(data.id))!;
      },
    };
  }

  get threads() {
    const ctx = this.context;
    if (!ctx) throw new Error("Channel not bound to client context");
    const channelId = this.id;
    const rest = ctx.rest;
    const channelCache = ctx.cache.channels;
    const threadCache = ctx.cache.threads;
    const threadMembersCache = ctx.cache.threadMembers;
    return {
      async create(options: {
        name: string;
        auto_archive_duration?: ThreadAutoArchiveDuration;
        type?: number;
        invitable?: boolean;
        rate_limit_per_user?: number;
      }) {
        const ThreadCtor = await getThread();
        const data = await rest.post<APIChannel>(`/channels/${channelId}/threads`, {
          name: options.name,
          auto_archive_duration: options.auto_archive_duration,
          type: options.type,
          invitable: options.invitable,
          rate_limit_per_user: options.rate_limit_per_user,
        });
        await channelCache.add(data.id, data);
        await threadCache.add(data.id, data);
        return await threadCache.get(data.id);
      },
      async createFromMessage(
        messageId: string,
        options: {
          name: string;
          auto_archive_duration?: ThreadAutoArchiveDuration;
          rate_limit_per_user?: number;
        },
      ) {
        const ThreadCtor = await getThread();
        const data = await rest.post<APIChannel>(
          `/channels/${channelId}/messages/${messageId}/threads`,
          {
            name: options.name,
            auto_archive_duration: options.auto_archive_duration,
            rate_limit_per_user: options.rate_limit_per_user,
          },
        );
        await channelCache.add(data.id, data);
        await threadCache.add(data.id, data);
        return await threadCache.get(data.id);
      },
      async listPublicArchived(options?: {
        before?: string;
        limit?: number;
      }) {
        const [ThreadCtor, ThreadMemberCtor] = await Promise.all([
          getThread(),
          getThreadMember(),
        ]);
        let url = `/channels/${channelId}/threads/archived/public`;
        const params: string[] = [];
        if (options?.before) params.push(`before=${encodeURIComponent(options.before)}`);
        if (options?.limit !== undefined) params.push(`limit=${options.limit}`);
        if (params.length > 0) url += `?${params.join("&")}`;
        const data = await rest.get<APIThreadList & { has_more: boolean }>(url);
        for (const thread of data.threads) {
          await channelCache.add(thread.id, thread);
          await threadCache.add(thread.id, thread);
        }
        for (const member of data.members) {
          await threadMembersCache.add(member.user_id!, member);
        }
        const threads: any[] = [];
        for (const t of data.threads) {
          threads.push(await threadCache.get(t.id));
        }
        const members: any[] = [];
        for (const m of data.members) {
          members.push(await threadMembersCache.get(m.user_id!));
        }
        return {
          threads,
          members,
          has_more: data.has_more,
        };
      },
      async listPrivateArchived(options?: {
        before?: string;
        limit?: number;
      }) {
        const [ThreadCtor, ThreadMemberCtor] = await Promise.all([
          getThread(),
          getThreadMember(),
        ]);
        let url = `/channels/${channelId}/threads/archived/private`;
        const params: string[] = [];
        if (options?.before) params.push(`before=${encodeURIComponent(options.before)}`);
        if (options?.limit !== undefined) params.push(`limit=${options.limit}`);
        if (params.length > 0) url += `?${params.join("&")}`;
        const data = await rest.get<APIThreadList & { has_more: boolean }>(url);
        for (const thread of data.threads) {
          await channelCache.add(thread.id, thread);
          await threadCache.add(thread.id, thread);
        }
        for (const member of data.members) {
          await threadMembersCache.add(member.user_id!, member);
        }
        const threads: any[] = [];
        for (const t of data.threads) {
          threads.push(await threadCache.get(t.id));
        }
        const members: any[] = [];
        for (const m of data.members) {
          members.push(await threadMembersCache.get(m.user_id!));
        }
        return {
          threads,
          members,
          has_more: data.has_more,
        };
      },
      async listJoinedPrivateArchived(options?: {
        before?: string;
        limit?: number;
      }) {
        const [ThreadCtor, ThreadMemberCtor] = await Promise.all([
          getThread(),
          getThreadMember(),
        ]);
        let url = `/channels/${channelId}/users/@me/threads/archived/private`;
        const params: string[] = [];
        if (options?.before) params.push(`before=${encodeURIComponent(options.before)}`);
        if (options?.limit !== undefined) params.push(`limit=${options.limit}`);
        if (params.length > 0) url += `?${params.join("&")}`;
        const data = await rest.get<APIThreadList & { has_more: boolean }>(url);
        for (const thread of data.threads) {
          await channelCache.add(thread.id, thread);
          await threadCache.add(thread.id, thread);
        }
        for (const member of data.members) {
          await threadMembersCache.add(member.user_id!, member);
        }
        const threads: any[] = [];
        for (const t of data.threads) {
          threads.push(await threadCache.get(t.id));
        }
        const members: any[] = [];
        for (const m of data.members) {
          members.push(await threadMembersCache.get(m.user_id!));
        }
        return {
          threads,
          members,
          has_more: data.has_more,
        };
      },
    };
  }
}
