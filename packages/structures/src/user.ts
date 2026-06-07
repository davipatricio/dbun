import { BaseStructure } from "./base.js";
import type { APIUser } from "@dbun/types";

export class User extends BaseStructure<APIUser> {
  get username(): string {
    return this.data.username;
  }

  get discriminator(): string {
    return this.data.discriminator;
  }

  get globalName(): string | null {
    return this.data.global_name;
  }

  get avatar(): string | null {
    return this.data.avatar;
  }

  get bot(): boolean {
    return this.data.bot ?? false;
  }

  get system(): boolean {
    return this.data.system ?? false;
  }

  get tag(): string {
    return this.discriminator === "0" ? this.username : `${this.username}#${this.discriminator}`;
  }

  avatarURL(options?: { size?: number; format?: string }): string {
    if (!this.avatar) {
      const index = (BigInt(this.id) >> 22n) % 6n;
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }
    const format = options?.format ?? (this.avatar.startsWith("a_") ? "gif" : "webp");
    const size = options?.size ?? 128;
    return `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.${format}?size=${size}`;
  }
}
