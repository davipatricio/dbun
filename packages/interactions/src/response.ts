import type {
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  APIInteraction,
  RESTPostAPIInteractionFollowupJSONBody,
} from "@dbun/types";
import { InteractionResponseType } from "@dbun/types";
import type { RESTClient } from "@dbun/rest";

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

  async reply(data: APIInteractionResponseCallbackData): Promise<void> {
    await this.send({
      type: InteractionResponseType.ChannelMessageWithSource,
      data,
    });
    this.replied = true;
  }

  async deferReply(ephemeral = false): Promise<void> {
    await this.send({
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: { flags: ephemeral ? 64 : undefined },
    });
    this.replied = true;
  }

  async editReply(data: APIInteractionResponseCallbackData): Promise<void> {
    await this.rest.patch(`/webhooks/${this.applicationId}/${this.token}/messages/@original`, data);
  }

  async deleteReply(): Promise<void> {
    await this.rest.delete(`/webhooks/${this.applicationId}/${this.token}/messages/@original`);
  }

  async followUp(data: RESTPostAPIInteractionFollowupJSONBody): Promise<void> {
    await this.rest.post(`/webhooks/${this.applicationId}/${this.token}`, data);
  }

  async deferUpdate(): Promise<void> {
    await this.send({
      type: InteractionResponseType.DeferredMessageUpdate,
    });
  }

  async update(data: APIInteractionResponseCallbackData): Promise<void> {
    await this.send({
      type: InteractionResponseType.UpdateMessage,
      data,
    });
    this.replied = true;
  }

  private async send(response: APIInteractionResponse): Promise<void> {
    const url = `https://discord.com/api/v10/interactions/${this.interaction.id}/${this.interaction.token}/callback`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    });
  }
}
