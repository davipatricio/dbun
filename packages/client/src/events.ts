import type {
  GatewayGuildCreateDispatchData,
  GatewayGuildUpdateDispatchData,
  GatewayGuildDeleteDispatchData,
  GatewayChannelCreateDispatchData,
  GatewayChannelUpdateDispatchData,
  GatewayChannelDeleteDispatchData,
  GatewayMessageCreateDispatchData,
  GatewayMessageUpdateDispatchData,
  GatewayMessageDeleteDispatchData,
  GatewayGuildMemberAddDispatchData,
  GatewayGuildMemberUpdateDispatchData,
  GatewayGuildMemberRemoveDispatchData,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayGuildEmojisUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
  GatewayUserUpdateDispatchData,
  GatewayInteractionCreateDispatchData,
  GatewayMessageDeleteBulkDispatchData,
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayPresenceUpdateDispatchData,
  GatewayTypingStartDispatchData,
  GatewayInviteCreateDispatchData,
  GatewayInviteDeleteDispatchData,
  GatewayGuildBanAddDispatchData,
  GatewayGuildBanRemoveDispatchData,
  GatewayGuildIntegrationsUpdateDispatchData,
  GatewayWebhooksUpdateDispatchData,
  GatewayStageInstanceCreateDispatchData,
  GatewayStageInstanceUpdateDispatchData,
  GatewayStageInstanceDeleteDispatchData,
  GatewayThreadCreateDispatchData,
  GatewayThreadUpdateDispatchData,
  GatewayThreadDeleteDispatchData,
  GatewayThreadListSyncDispatchData,
} from "@dbun/types";
import type { Client } from "./client.js";

export interface ClientEvents {
  ready: [data: { client: Client }];
  debug: [message: string];
  error: [error: Error];
  rawDispatch: [event: string, data: unknown];

  GUILD_CREATE: [data: GatewayGuildCreateDispatchData];
  GUILD_UPDATE: [data: GatewayGuildUpdateDispatchData];
  GUILD_DELETE: [data: GatewayGuildDeleteDispatchData];
  CHANNEL_CREATE: [data: GatewayChannelCreateDispatchData];
  CHANNEL_UPDATE: [data: GatewayChannelUpdateDispatchData];
  CHANNEL_DELETE: [data: GatewayChannelDeleteDispatchData];
  MESSAGE_CREATE: [data: GatewayMessageCreateDispatchData];
  MESSAGE_UPDATE: [data: GatewayMessageUpdateDispatchData];
  MESSAGE_DELETE: [data: GatewayMessageDeleteDispatchData];
  MESSAGE_DELETE_BULK: [data: GatewayMessageDeleteBulkDispatchData];
  MESSAGE_REACTION_ADD: [data: GatewayMessageReactionAddDispatchData];
  MESSAGE_REACTION_REMOVE: [data: GatewayMessageReactionRemoveDispatchData];
  MESSAGE_REACTION_REMOVE_ALL: [data: GatewayMessageReactionRemoveAllDispatchData];
  MESSAGE_REACTION_REMOVE_EMOJI: [data: GatewayMessageReactionRemoveEmojiDispatchData];
  INTERACTION_CREATE: [data: GatewayInteractionCreateDispatchData];
  GUILD_MEMBER_ADD: [data: GatewayGuildMemberAddDispatchData];
  GUILD_MEMBER_UPDATE: [data: GatewayGuildMemberUpdateDispatchData];
  GUILD_MEMBER_REMOVE: [data: GatewayGuildMemberRemoveDispatchData];
  GUILD_ROLE_CREATE: [data: GatewayGuildRoleCreateDispatchData];
  GUILD_ROLE_UPDATE: [data: GatewayGuildRoleUpdateDispatchData];
  GUILD_ROLE_DELETE: [data: GatewayGuildRoleDeleteDispatchData];
  GUILD_EMOJIS_UPDATE: [data: GatewayGuildEmojisUpdateDispatchData];
  VOICE_STATE_UPDATE: [data: GatewayVoiceStateUpdateDispatchData];
  USER_UPDATE: [data: GatewayUserUpdateDispatchData];
  PRESENCE_UPDATE: [data: GatewayPresenceUpdateDispatchData];
  TYPING_START: [data: GatewayTypingStartDispatchData];
  INVITE_CREATE: [data: GatewayInviteCreateDispatchData];
  INVITE_DELETE: [data: GatewayInviteDeleteDispatchData];
  GUILD_BAN_ADD: [data: GatewayGuildBanAddDispatchData];
  GUILD_BAN_REMOVE: [data: GatewayGuildBanRemoveDispatchData];
  GUILD_INTEGRATIONS_UPDATE: [data: GatewayGuildIntegrationsUpdateDispatchData];
  WEBHOOKS_UPDATE: [data: GatewayWebhooksUpdateDispatchData];
  STAGE_INSTANCE_CREATE: [data: GatewayStageInstanceCreateDispatchData];
  STAGE_INSTANCE_UPDATE: [data: GatewayStageInstanceUpdateDispatchData];
  STAGE_INSTANCE_DELETE: [data: GatewayStageInstanceDeleteDispatchData];
  THREAD_CREATE: [data: GatewayThreadCreateDispatchData];
  THREAD_UPDATE: [data: GatewayThreadUpdateDispatchData];
  THREAD_DELETE: [data: GatewayThreadDeleteDispatchData];
  THREAD_LIST_SYNC: [data: GatewayThreadListSyncDispatchData];
}
