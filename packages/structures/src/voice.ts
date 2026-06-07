import { BaseStructure } from "./base.js";
import type { APIVoiceState } from "@dbun/types";

export class VoiceState extends BaseStructure<APIVoiceState> {
  get channelId(): string | null {
    return this.data.channel_id;
  }

  get userId(): string {
    return this.data.user_id;
  }

  get guildId(): string | undefined {
    return this.data.guild_id;
  }

  get sessionId(): string {
    return this.data.session_id;
  }

  get deaf(): boolean {
    return this.data.deaf;
  }

  get mute(): boolean {
    return this.data.mute;
  }

  get selfDeaf(): boolean {
    return this.data.self_deaf;
  }

  get selfMute(): boolean {
    return this.data.self_mute;
  }

  get suppress(): boolean {
    return this.data.suppress;
  }

  get connected(): boolean {
    return this.data.channel_id !== null;
  }
}
