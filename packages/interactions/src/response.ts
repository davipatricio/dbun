import type {
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIInteraction,
  RESTPostAPIInteractionFollowupJSONBody,
  RESTPostAPIInteractionFollowupResult,
  APIApplicationCommandOptionChoice,
} from "@dbun/types";
import { InteractionResponseType, MessageFlags } from "@dbun/types";
import type { RESTClient } from "@dbun/rest";
import type { ModalBuilder } from "./builders/modal.js";

interface ResolvedUsersMap {
  [key: string]: import("@dbun/types").APIUser;
}

interface ResolvedMembersMap {
  [key: string]: import("@dbun/types").APIGuildMember;
}

interface ResolvedRolesMap {
  [key: string]: import("@dbun/types").APIRole;
}

interface ResolvedChannelsMap {
  [key: string]: import("@dbun/types").APIChannel;
}

interface ResolvedMessagesMap {
  [key: string]: import("@dbun/types").APIMessage;
}

export class InteractionResponse {
  private rest: RESTClient;
  private interaction: APIInteraction;
  private replied = false;

  constructor(rest: RESTClient, interaction: APIInteraction) {
    this.rest = rest;
    this.interaction = interaction;
  }

  get applicationId(): string {
    return this.interaction.application_id;
  }

  get token(): string {
    return this.interaction.token;
  }

  get isReplied(): boolean {
    return this.replied;
  }

  getResolvedData() {
    const data = this.interaction.data as Record<string, unknown> | undefined;
    const resolved = data?.resolved as Record<string, unknown> | undefined;
    return {
      users: (resolved?.users ?? {}) as ResolvedUsersMap,
      members: (resolved?.members ?? {}) as ResolvedMembersMap,
      roles: (resolved?.roles ?? {}) as ResolvedRolesMap,
      channels: (resolved?.channels ?? {}) as ResolvedChannelsMap,
      messages: (resolved?.messages ?? {}) as ResolvedMessagesMap,
    };
  }

  private guard(): void {
    if (this.replied) {
      throw new Error(
        "InteractionResponse: this interaction has already been replied to. " +
          "Each interaction may only be responded to once.",
      );
    }
  }

  async reply(data: APIInteractionResponseCallbackData): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
    this.replied = true;
  }

  async deferReply(ephemeral = false): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
    });
    this.replied = true;
  }

  async editReply(data: APIInteractionResponseCallbackData): Promise<void> {
    await this.rest.patch(
      `/webhooks/${this.applicationId}/${this.token}/messages/@original`,
      data,
    );
  }

  async deleteReply(): Promise<void> {
    await this.rest.delete(
      `/webhooks/${this.applicationId}/${this.token}/messages/@original`,
    );
  }

  async followUp(
    data: RESTPostAPIInteractionFollowupJSONBody,
  ): Promise<RESTPostAPIInteractionFollowupResult> {
    return this.rest.post<RESTPostAPIInteractionFollowupResult>(
      `/webhooks/${this.applicationId}/${this.token}`,
      data,
    );
  }

  async editFollowUp(
    messageId: string,
    data: RESTPostAPIInteractionFollowupJSONBody,
  ): Promise<RESTPostAPIInteractionFollowupResult> {
    return this.rest.patch<RESTPostAPIInteractionFollowupResult>(
      `/webhooks/${this.applicationId}/${this.token}/messages/${messageId}`,
      data,
    );
  }

  async deleteFollowUp(messageId: string): Promise<void> {
    await this.rest.delete(
      `/webhooks/${this.applicationId}/${this.token}/messages/${messageId}`,
    );
  }

  async deferUpdate(): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.DeferredMessageUpdate,
    });
    this.replied = true;
  }

  async update(data: APIInteractionResponseCallbackData): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.UpdateMessage,
      data,
    });
    this.replied = true;
  }

  async sendModal(modal: ModalBuilder): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.Modal,
      data: modal.toJSON(),
    });
    this.replied = true;
  }

  async sendAutocompleteResult(
    choices: APIApplicationCommandOptionChoice[],
  ): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.ApplicationCommandAutocompleteResult,
      data: { choices },
    });
    this.replied = true;
  }

  async pong(): Promise<void> {
    this.guard();
    await this.send({
      type: InteractionResponseType.Pong,
    });
    this.replied = true;
  }

  private async send(response: APIInteractionResponse): Promise<void> {
    const path = `/interactions/${this.interaction.id}/${this.interaction.token}/callback`;
    await this.rest.post(path, response);
  }
}
