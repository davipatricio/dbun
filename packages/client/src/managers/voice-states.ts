import { BaseManager } from "./base.js";
import { VoiceState } from "@dbun/structures";
import type { APIVoiceState } from "@dbun/types";

export class VoiceStateManager extends BaseManager<VoiceState> {
  async fetch(guildId: string, userId: string): Promise<VoiceState | null> {
    const cached = await this.cache.get<APIVoiceState>(`${guildId}:${userId}`);
    if (cached) return new VoiceState(cached, this.context);
    return null;
  }
}
