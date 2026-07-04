import { Channel } from "./channel.js";
import { ThreadMember } from "./thread-member.js";
import type {
  APIChannel,
  APIAnnouncementThreadChannel,
  APIThreadMember,
  APIThreadMetadata,
  ThreadAutoArchiveDuration,
} from "@dbun/types";

export class Thread extends Channel {
  private get threadData(): APIAnnouncementThreadChannel {
    return this.data as unknown as APIAnnouncementThreadChannel;
  }

  get threadMetadata(): APIThreadMetadata | undefined {
    return this.threadData.thread_metadata;
  }

  get member(): APIThreadMember | undefined {
    return this.threadData.member;
  }

  get memberCount(): number | undefined {
    return this.threadData.member_count;
  }

  get messageCount(): number | undefined {
    return this.threadData.message_count;
  }

  get totalMessageSent(): number | undefined {
    return this.threadData.total_message_sent;
  }

  get ownerId(): string | undefined {
    return this.threadData.owner_id;
  }

  get appliedTags(): string[] | undefined {
    return this.threadData.applied_tags;
  }

  async join(): Promise<void> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    await ctx.rest.put(`/channels/${this.id}/thread-members/@me`);
  }

  async leave(): Promise<void> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    await ctx.rest.delete(`/channels/${this.id}/thread-members/@me`);
  }

  async addMember(userId: string): Promise<void> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    await ctx.rest.put(`/channels/${this.id}/thread-members/${userId}`);
  }

  async removeMember(userId: string): Promise<void> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    await ctx.rest.delete(`/channels/${this.id}/thread-members/${userId}`);
  }

  async listMembers(withMember?: boolean): Promise<ThreadMember[]> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const query = withMember ? "?with_member=true" : "";
    const data = await ctx.rest.get<APIThreadMember[]>(
      `/channels/${this.id}/thread-members${query}`,
    );
    return data.map((m) => new ThreadMember(m, ctx));
  }

  async fetchMember(
    userId: string,
    withMember?: boolean,
  ): Promise<ThreadMember | null> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const query = withMember ? "?with_member=true" : "";
    const data = await ctx.rest.get<APIThreadMember>(
      `/channels/${this.id}/thread-members/${userId}${query}`,
    );
    if (!data) return null;
    return new ThreadMember(data, ctx);
  }

  async setArchived(archived: boolean): Promise<Thread> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const data = await ctx.rest.patch<APIChannel>(`/channels/${this.id}`, {
      archived,
    });
    return new Thread(data, ctx);
  }

  async setLocked(locked: boolean): Promise<Thread> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const data = await ctx.rest.patch<APIChannel>(`/channels/${this.id}`, {
      locked,
    });
    return new Thread(data, ctx);
  }

  async setAutoArchiveDuration(
    duration: ThreadAutoArchiveDuration,
  ): Promise<Thread> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const data = await ctx.rest.patch<APIChannel>(`/channels/${this.id}`, {
      auto_archive_duration: duration,
    });
    return new Thread(data, ctx);
  }

  async setInvitable(invitable: boolean): Promise<Thread> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const data = await ctx.rest.patch<APIChannel>(`/channels/${this.id}`, {
      invitable,
    });
    return new Thread(data, ctx);
  }

  async setRateLimitPerUser(rateLimitPerUser: number): Promise<Thread> {
    const ctx = this.context;
    if (!ctx) throw new Error("Thread not bound to client context");
    const data = await ctx.rest.patch<APIChannel>(`/channels/${this.id}`, {
      rate_limit_per_user: rateLimitPerUser,
    });
    return new Thread(data, ctx);
  }
}
