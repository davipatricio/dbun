import { BaseStructure } from "./base.js";
import type { APIRole } from "@dbun/types";

export class Role extends BaseStructure<APIRole> {
  get name(): string {
    return this.data.name;
  }

  get color(): number {
    return this.data.color;
  }

  get hoist(): boolean {
    return this.data.hoist;
  }

  get position(): number {
    return this.data.position;
  }

  get permissions(): string {
    return this.data.permissions;
  }

  get managed(): boolean {
    return this.data.managed;
  }

  get mentionable(): boolean {
    return this.data.mentionable;
  }

  get icon(): string | null | undefined {
    return this.data.icon;
  }

  get unicodeEmoji(): string | null | undefined {
    return this.data.unicode_emoji;
  }
}
