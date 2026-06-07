import { BaseStructure } from "./base.js";
import type { APIBan } from "@dbun/types";

export class Ban extends BaseStructure<APIBan> {
  get reason(): string | null {
    return this.data.reason;
  }

  get userId(): string {
    return this.data.user.id;
  }

  get userTag(): string {
    const user = this.data.user;
    return user.discriminator === "0" ? user.username : `${user.username}#${user.discriminator}`;
  }
}
