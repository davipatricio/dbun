import type {
  APIInteraction,
  APIGuildMember,
  APIUser,
  APIMessage,
  APIInteractionDataResolved,
} from "@dbun/types";
import { BaseStructure } from "./base.js";

export class Interaction extends BaseStructure<APIInteraction> {
  get type(): number {
    return this.data.type;
  }

  get token(): string {
    return this.data.token;
  }

  get applicationId(): string {
    return this.data.application_id;
  }

  get guildId(): string | undefined {
    return this.data.guild_id;
  }

  get channelId(): string | undefined {
    return this.data.channel_id;
  }

  get member(): APIGuildMember | undefined {
    return this.data.member;
  }

  get user(): APIUser | undefined {
    return this.data.user;
  }

  get commandData(): unknown {
    return (this.data as { data?: unknown }).data;
  }

  get message(): APIMessage | undefined {
    return (this.data as { message?: APIMessage }).message;
  }

  get appPermissions(): string {
    return this.data.app_permissions;
  }

  get locale(): string | undefined {
    return (this.data as { locale?: string }).locale;
  }

  get guildLocale(): string | undefined {
    return (this.data as { guild_locale?: string }).guild_locale;
  }

  get resolved(): APIInteractionDataResolved | undefined {
    const data = (this.data as { data?: { resolved?: APIInteractionDataResolved } }).data;
    return data?.resolved;
  }

  get version(): number {
    return this.data.version;
  }
}
