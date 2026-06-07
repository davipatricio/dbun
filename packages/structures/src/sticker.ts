import { BaseStructure } from "./base.js";
import type { APISticker } from "@dbun/types";

export class Sticker extends BaseStructure<APISticker> {
  get name(): string {
    return this.data.name;
  }

  get description(): string | null {
    return this.data.description;
  }

  get tags(): string {
    return this.data.tags;
  }

  get formatType(): number {
    return this.data.format_type;
  }

  get type(): number {
    return this.data.type;
  }

  get available(): boolean {
    return this.data.available ?? true;
  }

  get guildId(): string | undefined {
    return this.data.guild_id;
  }
}
