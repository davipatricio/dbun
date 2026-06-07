import { BaseStructure } from "./base.js";
import type { APIGuildMember } from "@dbun/types";

export class GuildMember extends BaseStructure<APIGuildMember> {
  get nick(): string | null | undefined {
    return this.data.nick;
  }

  get roles(): string[] {
    return this.data.roles;
  }

  get joinedAt(): string | null {
    return this.data.joined_at;
  }

  get premiumSince(): string | null | undefined {
    return this.data.premium_since;
  }

  get deaf(): boolean {
    return this.data.deaf;
  }

  get mute(): boolean {
    return this.data.mute;
  }

  get pending(): boolean {
    return this.data.pending ?? false;
  }

  get displayName(): string {
    return this.data.nick ?? this.data.user?.username ?? "Unknown";
  }
}
