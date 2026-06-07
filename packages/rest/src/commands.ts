import type { RESTClient } from "./client.js";
import type {
  APIApplicationCommand,
  RESTPostAPIApplicationCommandsJSONBody,
  RESTPutAPIApplicationCommandsJSONBody,
} from "@dbun/types";

export class ApplicationCommandManager {
  private rest: RESTClient;
  private applicationId: string;

  constructor(rest: RESTClient, applicationId: string) {
    this.rest = rest;
    this.applicationId = applicationId;
  }

  async create(
    command: RESTPostAPIApplicationCommandsJSONBody,
    guildId?: string,
  ): Promise<APIApplicationCommand> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands`
      : `/applications/${this.applicationId}/commands`;
    return this.rest.post<APIApplicationCommand>(path, command);
  }

  async fetch(commandId: string, guildId?: string): Promise<APIApplicationCommand> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands/${commandId}`
      : `/applications/${this.applicationId}/commands/${commandId}`;
    return this.rest.get<APIApplicationCommand>(path);
  }

  async list(guildId?: string): Promise<APIApplicationCommand[]> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands`
      : `/applications/${this.applicationId}/commands`;
    return this.rest.get<APIApplicationCommand[]>(path);
  }

  async edit(
    commandId: string,
    command: Partial<RESTPostAPIApplicationCommandsJSONBody>,
    guildId?: string,
  ): Promise<APIApplicationCommand> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands/${commandId}`
      : `/applications/${this.applicationId}/commands/${commandId}`;
    return this.rest.patch<APIApplicationCommand>(path, command);
  }

  async delete(commandId: string, guildId?: string): Promise<void> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands/${commandId}`
      : `/applications/${this.applicationId}/commands/${commandId}`;
    await this.rest.delete(path);
  }

  async bulkOverwrite(
    commands: RESTPutAPIApplicationCommandsJSONBody,
    guildId?: string,
  ): Promise<APIApplicationCommand[]> {
    const path = guildId
      ? `/applications/${this.applicationId}/guilds/${guildId}/commands`
      : `/applications/${this.applicationId}/commands`;
    return this.rest.put<APIApplicationCommand[]>(path, commands);
  }
}
