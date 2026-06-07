import { BaseStructure } from "./base.js";
import type { APIEmoji } from "@dbun/types";

export class Emoji extends BaseStructure<APIEmoji> {
  get name(): string | null {
    return this.data.name;
  }

  get animated(): boolean {
    return this.data.animated ?? false;
  }

  get available(): boolean {
    return this.data.available ?? true;
  }

  get managed(): boolean {
    return this.data.managed ?? false;
  }

  get requireColons(): boolean {
    return this.data.require_colons ?? true;
  }

  get roles(): string[] | undefined {
    return this.data.roles;
  }
}
