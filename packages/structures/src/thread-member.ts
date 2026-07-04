import { BaseStructure } from "./base.js";
import type { APIThreadMember, ThreadMemberFlags } from "@dbun/types";

export class ThreadMember extends BaseStructure<APIThreadMember> {
  get userId(): string | undefined {
    return this.data.user_id;
  }

  get joinTimestamp(): string {
    return this.data.join_timestamp;
  }

  get flags(): ThreadMemberFlags {
    return this.data.flags;
  }

  get guildMember() {
    return this.data.member;
  }
}
