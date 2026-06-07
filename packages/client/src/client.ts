import { RESTClient, ApplicationCommandManager } from "@dbun/rest";
import { ShardManager } from "@dbun/ws";
import { CacheManager, MemoryAdapter, type CacheAdapter } from "@dbun/cache";
import { InteractionRouter } from "@dbun/interactions";
import { DBunTracer, DBunMetrics } from "@dbun/observability";
import type {
  GatewayIntentBits,
  APIGuild,
  APIChannel,
  APIMessage,
  APIUser,
  APIGuildMember,
  APIVoiceState,
  GatewayReadyDispatchData,
  GatewayGuildCreateDispatchData,
  GatewayGuildUpdateDispatchData,
  GatewayGuildDeleteDispatchData,
  GatewayChannelCreateDispatchData,
  GatewayChannelDeleteDispatchData,
  GatewayMessageCreateDispatchData,
  GatewayMessageUpdateDispatchData,
  GatewayMessageDeleteDispatchData,
  GatewayMessageDeleteBulkDispatchData,
  GatewayGuildMemberAddDispatchData,
  GatewayGuildMemberUpdateDispatchData,
  GatewayGuildMemberRemoveDispatchData,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayGuildEmojisUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
  GatewayUserUpdateDispatchData,
  GatewayGuildBanAddDispatchData,
  GatewayGuildBanRemoveDispatchData,
  GatewayThreadCreateDispatchData,
  GatewayThreadDeleteDispatchData,
  GatewayThreadListSyncDispatchData,
  GatewayStageInstanceCreateDispatchData,
  GatewayStageInstanceDeleteDispatchData,
} from "@dbun/types";
import {
  GuildManager,
  ChannelManager,
  MessageManager,
  UserManager,
  GuildMemberManager,
  RoleManager,
  EmojiManager,
  VoiceStateManager,
  BanManager,
} from "./managers/index.js";
import type { ClientEvents } from "./events.js";

export interface CacheResourceConfig {
  maxAge?: number;
  max?: number;
}

export interface ClientCacheOptions {
  adapter?: () => CacheAdapter;
  strategy?: Record<string, CacheResourceConfig>;
  sweepInterval?: number;
  resources?: {
    guilds?: CacheResourceConfig;
    channels?: CacheResourceConfig;
    users?: CacheResourceConfig;
    members?: CacheResourceConfig;
    messages?: CacheResourceConfig;
    roles?: CacheResourceConfig;
    emojis?: CacheResourceConfig;
    stickers?: CacheResourceConfig;
    voiceStates?: CacheResourceConfig;
    bans?: CacheResourceConfig;
    presences?: CacheResourceConfig;
    stageInstances?: CacheResourceConfig;
    scheduledEvents?: CacheResourceConfig;
  };
}

export interface ClientOptions {
  token: string;
  intents: GatewayIntentBits[];
  shard?: [number, number];
  cache?: ClientCacheOptions;
  applicationId?: string;
  observability?: {
    enabled?: boolean;
  };
}

export class Client {
  readonly token: string;
  readonly intents: GatewayIntentBits[];
  readonly rest: RESTClient;
  readonly interactions: InteractionRouter;
  readonly commands: ApplicationCommandManager | null;
  readonly tracer: DBunTracer;
  readonly metrics: DBunMetrics;

  readonly guilds: GuildManager;
  readonly channels: ChannelManager;
  readonly messages: MessageManager;
  readonly users: UserManager;
  readonly members: GuildMemberManager;
  readonly roles: RoleManager;
  readonly emojis: EmojiManager;
  readonly voiceStates: VoiceStateManager;
  readonly bans: BanManager;

  private shardManager: ShardManager | null = null;
  private ready = false;
  private eventHandlers = new Map<keyof ClientEvents | string, ((...args: any[]) => void)[]>();
  private managers: CacheManager[] = [];
  private applicationId?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on<K extends keyof ClientEvents>(event: K, handler: (...args: ClientEvents[K]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.eventHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      handler(...args);
    }
  }

  constructor(options: ClientOptions) {
    this.token = options.token;
    this.intents = options.intents;
    this.applicationId = options.applicationId;

    this.rest = new RESTClient({ token: options.token });

    const cacheOpts = options.cache;
    const adapterFactory = cacheOpts?.adapter ?? (() => new MemoryAdapter());

    const createManager = (namespace: string): CacheManager => {
      const resourceConfig = cacheOpts?.resources?.[namespace as keyof typeof cacheOpts.resources];
      const strategyConfig = cacheOpts?.strategy?.[namespace];
      const merged = {
        maxAge: resourceConfig?.maxAge ?? strategyConfig?.maxAge,
        max: resourceConfig?.max ?? strategyConfig?.max,
      };
      const strategy =
        merged.maxAge !== undefined || merged.max !== undefined
          ? { [namespace]: merged }
          : undefined;
      const manager = new CacheManager({
        adapter: adapterFactory(),
        strategy,
      });
      this.managers.push(manager);
      return manager;
    };

    this.guilds = new GuildManager(this.rest, createManager("guilds"), "guilds");
    this.channels = new ChannelManager(this.rest, createManager("channels"), "channels");
    this.messages = new MessageManager(this.rest, createManager("messages"), "messages");
    this.users = new UserManager(this.rest, createManager("users"), "users");
    this.members = new GuildMemberManager(this.rest, createManager("members"), "members");
    this.roles = new RoleManager(this.rest, createManager("roles"), "roles");
    this.emojis = new EmojiManager(this.rest, createManager("emojis"), "emojis");
    this.voiceStates = new VoiceStateManager(
      this.rest,
      createManager("voiceStates"),
      "voiceStates",
    );
    this.bans = new BanManager(this.rest, createManager("bans"), "bans");

    const context = {
      rest: this.rest,
      cache: {
        guilds: this.guilds.cache,
        channels: this.channels.cache,
        messages: this.messages.cache,
        users: this.users.cache,
        members: this.members.cache,
        roles: this.roles.cache,
        emojis: this.emojis.cache,
        voiceStates: this.voiceStates.cache,
        bans: this.bans.cache,
      },
    };

    this.guilds.setContext(context);
    this.channels.setContext(context);
    this.messages.setContext(context);
    this.users.setContext(context);
    this.members.setContext(context);
    this.roles.setContext(context);
    this.emojis.setContext(context);
    this.voiceStates.setContext(context);
    this.bans.setContext(context);

    this.interactions = new InteractionRouter();
    this.interactions.setRest(this.rest);

    this.commands = options.applicationId
      ? new ApplicationCommandManager(this.rest, options.applicationId)
      : null;

    this.tracer = new DBunTracer({
      enabled: options.observability?.enabled,
      onDebug: (msg) => this.emit("debug", msg),
    });
    this.metrics = new DBunMetrics();
  }

  get ws(): ShardManager | null {
    return this.shardManager;
  }

  async login(): Promise<void> {
    const intentsValue = this.intents.reduce((a, b) => a | b, 0);

    this.shardManager = new ShardManager({
      token: this.token,
      intents: intentsValue,
      totalShards: 1,
    });

    this.shardManager.on("ready", (_shardId: number) => {
      this.ready = true;
      this.emit("ready", { client: this });
    });

    this.shardManager.on("dispatch", (event: string, data: unknown, _shardId: number) => {
      this.handleDispatch(event, data);
    });

    this.shardManager.on("debug", (msg: string) => {
      this.emit("debug", msg);
    });

    this.shardManager.on("error", (error: unknown, _shardId: number) => {
      this.emit("error", error as Error);
    });

    await this.shardManager.connect();
  }

  async destroy(): Promise<void> {
    for (const manager of this.managers) {
      await manager.stop();
    }
    await this.shardManager?.destroy();
    this.shardManager = null;
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleDispatch(event: string, data: any): void {
    switch (event) {
      case "READY": {
        const readyData = data as GatewayReadyDispatchData;
        this.applicationId ??= readyData.application.id;
        this.users.cache.set(readyData.user.id, readyData.user, "users").catch(() => {});
        break;
      }
      case "GUILD_CREATE": {
        const guild = data as GatewayGuildCreateDispatchData;
        this.guilds.cache.set(guild.id, guild as unknown as APIGuild, "guilds").catch(() => {});
        for (const channel of guild.channels) {
          this.channels.cache.set(channel.id, channel, "channels").catch(() => {});
        }
        for (const member of guild.members) {
          this.members.cache
            .set(`${guild.id}:${member.user!.id}`, member, "members")
            .catch(() => {});
        }
        for (const role of guild.roles) {
          this.roles.cache.set(`${guild.id}:${role.id}`, role, "roles").catch(() => {});
        }
        for (const emoji of guild.emojis) {
          this.emojis.cache.set(`${guild.id}:${emoji.id!}`, emoji, "emojis").catch(() => {});
        }
        for (const vs of guild.voice_states ?? []) {
          this.voiceStates.cache
            .set(`${guild.id}:${vs.user_id}`, vs, "voiceStates")
            .catch(() => {});
        }
        break;
      }
      case "GUILD_UPDATE": {
        const guild = data as GatewayGuildUpdateDispatchData;
        this.guilds.cache.set(guild.id, guild as unknown as APIGuild, "guilds").catch(() => {});
        break;
      }
      case "GUILD_DELETE": {
        const guild = data as GatewayGuildDeleteDispatchData;
        this.guilds.cache.delete(guild.id).catch(() => {});
        this.members.cache.deleteByPrefix(`${guild.id}:`).catch(() => {});
        this.roles.cache.deleteByPrefix(`${guild.id}:`).catch(() => {});
        this.emojis.cache.deleteByPrefix(`${guild.id}:`).catch(() => {});
        this.voiceStates.cache.deleteByPrefix(`${guild.id}:`).catch(() => {});
        this.bans.cache.deleteByPrefix(`${guild.id}:`).catch(() => {});
        break;
      }
      case "CHANNEL_CREATE":
      case "CHANNEL_UPDATE": {
        const channel = data as GatewayChannelCreateDispatchData as APIChannel;
        this.channels.cache.set(channel.id, channel, "channels").catch(() => {});
        break;
      }
      case "CHANNEL_DELETE": {
        const channel = data as GatewayChannelDeleteDispatchData as APIChannel;
        this.channels.cache.delete(channel.id).catch(() => {});
        break;
      }
      case "MESSAGE_CREATE": {
        const msg = data as GatewayMessageCreateDispatchData;
        this.messages.cache.set(msg.id, msg as unknown as APIMessage, "messages").catch(() => {});
        break;
      }
      case "MESSAGE_UPDATE": {
        const msg = data as GatewayMessageUpdateDispatchData;
        if (msg.id) {
          this.messages.cache.set(msg.id, msg as unknown as APIMessage, "messages").catch(() => {});
        }
        break;
      }
      case "MESSAGE_DELETE": {
        const msg = data as GatewayMessageDeleteDispatchData;
        this.messages.cache.delete(msg.id).catch(() => {});
        break;
      }
      case "MESSAGE_DELETE_BULK": {
        const bulk = data as GatewayMessageDeleteBulkDispatchData;
        for (const id of bulk.ids) {
          this.messages.cache.delete(id).catch(() => {});
        }
        break;
      }
      case "GUILD_BAN_ADD": {
        const ban = data as GatewayGuildBanAddDispatchData;
        this.bans.cache.set(`${ban.guild_id}:${ban.user.id}`, ban, "bans").catch(() => {});
        break;
      }
      case "GUILD_BAN_REMOVE": {
        const ban = data as GatewayGuildBanRemoveDispatchData;
        this.bans.cache.delete(`${ban.guild_id}:${ban.user.id}`).catch(() => {});
        break;
      }
      case "THREAD_CREATE":
      case "THREAD_UPDATE": {
        const thread = data as GatewayThreadCreateDispatchData as APIChannel;
        this.channels.cache.set(thread.id, thread, "channels").catch(() => {});
        break;
      }
      case "THREAD_DELETE": {
        const thread = data as GatewayThreadDeleteDispatchData;
        this.channels.cache.delete(thread.id).catch(() => {});
        break;
      }
      case "THREAD_LIST_SYNC": {
        const sync = data as GatewayThreadListSyncDispatchData;
        for (const thread of sync.threads) {
          this.channels.cache.set(thread.id, thread, "channels").catch(() => {});
        }
        break;
      }
      case "STAGE_INSTANCE_CREATE":
      case "STAGE_INSTANCE_UPDATE": {
        const instance = data as GatewayStageInstanceCreateDispatchData;
        this.channels.cache.set(instance.id, instance, "channels").catch(() => {});
        break;
      }
      case "STAGE_INSTANCE_DELETE": {
        const instance = data as GatewayStageInstanceDeleteDispatchData;
        this.channels.cache.delete(instance.id).catch(() => {});
        break;
      }
      case "GUILD_MEMBER_ADD": {
        const member = data as GatewayGuildMemberAddDispatchData;
        this.members.cache
          .set(`${member.guild_id}:${member.user!.id}`, member, "members")
          .catch(() => {});
        break;
      }
      case "GUILD_MEMBER_UPDATE": {
        const member = data as GatewayGuildMemberUpdateDispatchData;
        this.members.cache
          .set(
            `${member.guild_id}:${member.user.id}`,
            member as unknown as APIGuildMember,
            "members",
          )
          .catch(() => {});
        break;
      }
      case "GUILD_MEMBER_REMOVE": {
        const member = data as GatewayGuildMemberRemoveDispatchData;
        this.members.cache.delete(`${member.guild_id}:${member.user.id}`).catch(() => {});
        break;
      }
      case "GUILD_ROLE_CREATE": {
        const roleData = data as GatewayGuildRoleCreateDispatchData;
        this.roles.cache
          .set(`${roleData.guild_id}:${roleData.role.id}`, roleData.role, "roles")
          .catch(() => {});
        break;
      }
      case "GUILD_ROLE_UPDATE": {
        const roleData = data as GatewayGuildRoleUpdateDispatchData;
        this.roles.cache
          .set(`${roleData.guild_id}:${roleData.role.id}`, roleData.role, "roles")
          .catch(() => {});
        break;
      }
      case "GUILD_ROLE_DELETE": {
        const roleData = data as GatewayGuildRoleDeleteDispatchData;
        this.roles.cache.delete(`${roleData.guild_id}:${roleData.role_id}`).catch(() => {});
        break;
      }
      case "GUILD_EMOJIS_UPDATE": {
        const emojiData = data as GatewayGuildEmojisUpdateDispatchData;
        for (const emoji of emojiData.emojis) {
          this.emojis.cache
            .set(`${emojiData.guild_id}:${emoji.id!}`, emoji, "emojis")
            .catch(() => {});
        }
        break;
      }
      case "VOICE_STATE_UPDATE": {
        const vs = data as GatewayVoiceStateUpdateDispatchData;
        if (vs.guild_id) {
          this.voiceStates.cache
            .set(`${vs.guild_id}:${vs.user_id}`, vs as unknown as APIVoiceState, "voiceStates")
            .catch(() => {});
        }
        break;
      }
      case "USER_UPDATE": {
        const user = data as GatewayUserUpdateDispatchData;
        this.users.cache.set(user.id, user as unknown as APIUser, "users").catch(() => {});
        break;
      }
    }

    this.emit(event, data);

    if (event === "INTERACTION_CREATE") {
      this.interactions.handle(data as never).catch(() => {});
    }
  }
}
