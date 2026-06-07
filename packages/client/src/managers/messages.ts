import { BaseManager } from "./base.js";
import { Message } from "@dbun/structures";
import type { APIMessage } from "@dbun/types";

export class MessageManager extends BaseManager<Message> {
  async fetch(channelId: string, id: string): Promise<Message | null> {
    const cached = await this.cache.get<APIMessage>(id);
    if (cached) return new Message(cached, this.context);

    const data = await this.rest.get<APIMessage>(`/channels/${channelId}/messages/${id}`);
    if (!data) return null;

    await this.cache.set(id, data, this.namespace);
    return new Message(data, this.context);
  }
}
