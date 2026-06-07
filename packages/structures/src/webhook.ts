import { BaseStructure } from "./base.js";
import type { APIWebhook } from "@dbun/types";

export class Webhook extends BaseStructure<APIWebhook> {
  get name(): string | null {
    return this.data.name;
  }

  get type(): number {
    return this.data.type;
  }

  get channelId(): string | null {
    return this.data.channel_id;
  }

  get guildId(): string | null | undefined {
    return this.data.guild_id;
  }

  get token(): string | undefined {
    return this.data.token;
  }

  get applicationId(): string | null {
    return this.data.application_id;
  }
}
