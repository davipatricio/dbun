import { BaseStructure } from "./base.js";
import type { APIMessage } from "@dbun/types";

export class Message extends BaseStructure<APIMessage> {
  get content(): string {
    return this.data.content;
  }

  get authorId(): string {
    return this.data.author.id;
  }

  get channelId(): string {
    return this.data.channel_id;
  }

  get timestamp(): string {
    return this.data.timestamp;
  }

  get editedTimestamp(): string | null {
    return this.data.edited_timestamp;
  }

  get pinned(): boolean {
    return this.data.pinned;
  }

  get tts(): boolean {
    return this.data.tts;
  }

  get mentionEveryone(): boolean {
    return this.data.mention_everyone;
  }
}
