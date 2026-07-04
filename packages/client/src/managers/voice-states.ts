import { BaseManager } from "./base.js";
import { VoiceState } from "@dbun/structures";

export class VoiceStateManager extends BaseManager<VoiceState> {
  async fetch(guildId: string, userId: string): Promise<VoiceState | null> {
    const key = `${guildId}:${userId}`;
    const cached = await this.cache.get(key);
    if (cached) return cached;
    return null;
  }
}
