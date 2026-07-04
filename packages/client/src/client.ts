import { RESTClient, ApplicationCommandManager } from "@dbun/rest";
import { ShardManager } from "@dbun/ws";
import type { EncodingMode, CompressionMode } from "@dbun/ws";
import {
  HydratingCache,
  CacheManager,
  MemoryAdapter,
  type CacheAdapter,
} from "@dbun/cache";
import { InteractionRouter } from "@dbun/interactions";
import { DBunTracer, DBunMetrics } from "@dbun/observability";
import {
  Guild,
  Channel,
  Message,
  User,
  GuildMember,
  Role,
  Emoji,
  VoiceState,
  Ban,
  Thread,
  ThreadMember,
} from "@dbun/structures";
import type {
  GatewayIntentBits,
  APIGuild,
  APIChannel,
  APIMessage,
  APIUser,
  APIGuildMember,
  APIRole,
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
  GatewayThreadMemberUpdateDispatchData,
  GatewayThreadMembersUpdateDispatchData,
  GatewayStageInstanceCreateDispatchData,
  GatewayStageInstanceDeleteDispatchData,
} from "@dbun/types";
import type { IPCAdapter, ShardRange, AssignmentStrategy } from "@dbun/ipc";
import {
  GuildManager,
  ChannelManager,
  ThreadManager,
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
    threads?: CacheResourceConfig;
    users?: CacheResourceConfig;
    members?: CacheResourceConfig;
    messages?: CacheResourceConfig;
    roles?: CacheResourceConfig;
    emojis?: CacheResourceConfig;
    stickers?: CacheResourceConfig;
    voiceStates?: CacheResourceConfig;
    bans?: CacheResourceConfig;
    threadMembers?: CacheResourceConfig;
    presences?: CacheResourceConfig;
    stageInstances?: CacheResourceConfig;
    scheduledEvents?: CacheResourceConfig;
  };
}

export interface ClientIPCOptions {
  mode: "coordinator" | "worker";
  adapter: IPCAdapter;
  workerId?: string;
  totalShards?: number | "auto";
  assignment?: "auto" | Record<string, ShardRange> | AssignmentStrategy;
  shards?: ShardRange;
  presence?: unknown;
  encoding?: EncodingMode;
  compress?: CompressionMode;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  maxConcurrency?: number;
  heartbeatInterval?: number;
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
  ipc?: ClientIPCOptions;
  encoding?: EncodingMode;
  compress?: CompressionMode;
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
  readonly threads: ThreadManager;

  private shardManager: ShardManager | null = null;
  private gatewayManager: import("@dbun/ipc").GatewayManager | null = null;
  private ready = false;
  private eventHandlers = new Map<keyof ClientEvents | string, ((...args: any[]) => void)[]>();
  private cacheInstances: HydratingCache<any>[] = [];
  private applicationId?: string;
  private ipcOptions?: ClientIPCOptions;
  private threadMembersCache: HydratingCache<any>;
  private encoding?: EncodingMode;
  private compress?: CompressionMode;

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
    this.ipcOptions = options.ipc;
    this.encoding = options.encoding ?? "json";
    this.compress = options.compress ?? null;

    this.rest = new RESTClient({ token: options.token });

    const cacheOpts = options.cache;
    const adapterFactory = cacheOpts?.adapter ?? (() => new MemoryAdapter());

    const createCache = <T>(
      namespace: string,
      hydrate: (data: unknown) => T,
      partialHydrate?: (data: unknown) => unknown,
    ): HydratingCache<T> => {
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
      const raw = new HydratingCache({
        raw: new CacheManager({
          adapter: adapterFactory(),
          strategy,
        }),
        namespace,
        hydrate,
        partialHydrate,
      });
      this.cacheInstances.push(raw);
      return raw;
    };

    const guildCache = createCache("guilds", (d) => new Guild(d as APIGuild));
    const channelCache = createCache("channels", (d) => new Channel(d as APIChannel));
    const threadCache = createCache("threads", (d) => new Thread(d as APIChannel));
    const messageCache = createCache("messages", (d) => new Message(d as APIMessage));
    const userCache = createCache("users", (d) => new User(d as APIUser));
    const memberCache = createCache("members", (d) => new GuildMember(d as APIGuildMember));
    const roleCache = createCache("roles", (d) => new Role(d as APIRole));
    const emojiCache = createCache("emojis", (d) => new Emoji(d as any));
    const voiceStateCache = createCache("voiceStates", (d) => new VoiceState(d as APIVoiceState));
    const banCache = createCache("bans", (d) => new Ban(d as any));
    const threadMembersCache = createCache(
      "threadMembers",
      (d) => new ThreadMember(d as any),
      (d) => new ThreadMember(d as any),
    );

    this.guilds = new GuildManager(this.rest, guildCache, "guilds");
    this.channels = new ChannelManager(this.rest, channelCache, "channels");
    this.messages = new MessageManager(this.rest, messageCache, "messages");
    this.users = new UserManager(this.rest, userCache, "users");
    this.members = new GuildMemberManager(this.rest, memberCache, "members");
    this.roles = new RoleManager(this.rest, roleCache, "roles");
    this.emojis = new EmojiManager(this.rest, emojiCache, "emojis");
    this.voiceStates = new VoiceStateManager(this.rest, voiceStateCache, "voiceStates");
    this.bans = new BanManager(this.rest, banCache, "bans");
    this.threads = new ThreadManager(this.rest, threadCache, "threads");
    this.threadMembersCache = threadMembersCache;

    const context = {
      rest: this.rest,
      cache: {
        guilds: this.guilds.cache as any,
        channels: this.channels.cache as any,
        threads: this.threads.cache as any,
        messages: this.messages.cache as any,
        users: this.users.cache as any,
        members: this.members.cache as any,
        roles: this.roles.cache as any,
        emojis: this.emojis.cache as any,
        voiceStates: this.voiceStates.cache as any,
        bans: this.bans.cache as any,
        threadMembers: threadMembersCache as any,
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
    this.threads.setContext(context);

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
    if (this.ipcOptions) {
      const { GatewayManager } = await import("@dbun/ipc");
      const intentsValue = this.intents.reduce((a, b) => a | b, 0);

      if (this.ipcOptions.mode === "coordinator") {
        this.gatewayManager = new GatewayManager({
          mode: "coordinator",
          adapter: this.ipcOptions.adapter,
          token: this.token,
          totalShards: this.ipcOptions.totalShards,
          assignment: this.ipcOptions.assignment,
          healthCheckInterval: this.ipcOptions.healthCheckInterval,
          healthCheckTimeout: this.ipcOptions.healthCheckTimeout,
          maxConcurrency: this.ipcOptions.maxConcurrency,
        });

        this.gatewayManager.on("shard:ready", (_shardId: number, _workerId: string) => {
          if (!this.ready) {
            this.ready = true;
            this.emit("ready", { client: this });
          }
        });

        this.gatewayManager.on("shard:event", (_shardId: number, event: string, data: unknown) => {
          this.handleDispatch(event, data);
        });

        this.gatewayManager.on("debug", (msg: string) => {
          this.emit("debug", msg);
        });

        this.gatewayManager.on("shard:error", (_shardId: number, error: unknown) => {
          this.emit("error", error as Error);
        });

        this.gatewayManager.on("worker:join", (workerId: string) => {
          this.emit("debug", `IPC worker joined: ${workerId}`);
        });

        this.gatewayManager.on("worker:leave", (workerId: string) => {
          this.emit("debug", `IPC worker left: ${workerId}`);
        });

        await this.gatewayManager.start();
      } else {
        this.gatewayManager = new GatewayManager({
          mode: "worker",
          adapter: this.ipcOptions.adapter,
          workerId: this.ipcOptions.workerId!,
          token: this.token,
          intents: intentsValue,
          shards: this.ipcOptions.shards,
          totalShards: typeof this.ipcOptions.totalShards === "number" ? this.ipcOptions.totalShards : undefined,
          presence: this.ipcOptions.presence,
          encoding: this.ipcOptions.encoding,
          compress: this.ipcOptions.compress,
          heartbeatInterval: this.ipcOptions.heartbeatInterval,
        });

        this.gatewayManager.on("debug", (msg: string) => {
          this.emit("debug", msg);
        });

        await this.gatewayManager.start();
      }
      return;
    }

    const intentsValue = this.intents.reduce((a, b) => a | b, 0);

    this.shardManager = new ShardManager({
      token: this.token,
      intents: intentsValue,
      totalShards: 1,
      encoding: this.encoding,
      compress: this.compress,
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
    for (const cache of this.cacheInstances) {
      await cache.stop();
    }
    if (this.gatewayManager) {
      await this.gatewayManager.stop();
      this.gatewayManager = null;
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
        this.users.add(readyData.user.id, readyData.user).catch(() => {});
        break;
      }
      case "GUILD_CREATE": {
        const guild = data as GatewayGuildCreateDispatchData;
        this.guilds.add(guild.id, guild as unknown as APIGuild).catch(() => {});
        for (const channel of guild.channels) {
          this.channels.add(channel.id, channel).catch(() => {});
        }
        for (const member of guild.members) {
          this.members.add(`${guild.id}:${member.user!.id}`, member).catch(() => {});
        }
        for (const role of guild.roles) {
          this.roles.add(`${guild.id}:${role.id}`, role).catch(() => {});
        }
        for (const emoji of guild.emojis) {
          this.emojis.add(`${guild.id}:${emoji.id!}`, emoji).catch(() => {});
        }
        for (const vs of guild.voice_states ?? []) {
          this.voiceStates.add(`${guild.id}:${vs.user_id}`, vs).catch(() => {});
        }
        break;
      }
      case "GUILD_UPDATE": {
        const guild = data as GatewayGuildUpdateDispatchData;
        this.guilds.add(guild.id, guild as unknown as APIGuild).catch(() => {});
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
        this.channels.add(channel.id, channel).catch(() => {});
        break;
      }
      case "CHANNEL_DELETE": {
        const channel = data as GatewayChannelDeleteDispatchData as APIChannel;
        this.channels.cache.delete(channel.id).catch(() => {});
        break;
      }
      case "MESSAGE_CREATE": {
        const msg = data as GatewayMessageCreateDispatchData;
        this.messages.add(msg.id, msg as unknown as APIMessage).catch(() => {});
        break;
      }
      case "MESSAGE_UPDATE": {
        const msg = data as GatewayMessageUpdateDispatchData;
        if (msg.id) {
          this.messages.add(msg.id, msg as unknown as APIMessage).catch(() => {});
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
        this.bans.add(`${ban.guild_id}:${ban.user.id}`, ban).catch(() => {});
        break;
      }
      case "GUILD_BAN_REMOVE": {
        const ban = data as GatewayGuildBanRemoveDispatchData;
        this.bans.cache.delete(`${ban.guild_id}:${ban.user.id}`).catch(() => {});
        break;
      }
      case "THREAD_CREATE":
      case "THREAD_UPDATE": {
        const thread = data as GatewayThreadCreateDispatchData;
        this.channels.add(thread.id, thread).catch(() => {});
        this.threads.add(thread.id, thread).catch(() => {});
        if (thread.member) {
          const member = thread.member;
          this.threadMembersCache
            .add(`${thread.id}:${member.user_id!}`, member)
            .catch(() => {});
        }
        break;
      }
      case "THREAD_DELETE": {
        const thread = data as GatewayThreadDeleteDispatchData;
        this.channels.cache.delete(thread.id).catch(() => {});
        this.threads.cache.delete(thread.id).catch(() => {});
        break;
      }
      case "THREAD_LIST_SYNC": {
        const sync = data as GatewayThreadListSyncDispatchData;
        for (const thread of sync.threads) {
          this.channels.add(thread.id, thread).catch(() => {});
          this.threads.add(thread.id, thread).catch(() => {});
        }
        for (const member of sync.members) {
          this.threadMembersCache
            .add(`${member.id!}:${member.user_id!}`, member)
            .catch(() => {});
        }
        break;
      }
      case "THREAD_MEMBER_UPDATE": {
        const tm = data as GatewayThreadMemberUpdateDispatchData;
        this.threadMembersCache
          .add(`${tm.id!}:${tm.user_id!}`, tm)
          .catch(() => {});
        break;
      }
      case "THREAD_MEMBERS_UPDATE": {
        const tmu = data as GatewayThreadMembersUpdateDispatchData;
        for (const member of tmu.added_members ?? []) {
          this.threadMembersCache
            .add(`${tmu.id}:${member.user_id!}`, member)
            .catch(() => {});
        }
        for (const removedId of tmu.removed_member_ids ?? []) {
          this.threadMembersCache.delete(`${tmu.id}:${removedId}`).catch(() => {});
        }
        break;
      }
      case "STAGE_INSTANCE_CREATE":
      case "STAGE_INSTANCE_UPDATE": {
        const instance = data as GatewayStageInstanceCreateDispatchData;
        this.channels.add(instance.id, instance).catch(() => {});
        break;
      }
      case "STAGE_INSTANCE_DELETE": {
        const instance = data as GatewayStageInstanceDeleteDispatchData;
        this.channels.cache.delete(instance.id).catch(() => {});
        break;
      }
      case "GUILD_MEMBER_ADD": {
        const member = data as GatewayGuildMemberAddDispatchData;
        this.members
          .add(`${member.guild_id}:${member.user!.id}`, member)
          .catch(() => {});
        break;
      }
      case "GUILD_MEMBER_UPDATE": {
        const member = data as GatewayGuildMemberUpdateDispatchData;
        this.members
          .add(
            `${member.guild_id}:${member.user.id}`,
            member as unknown as APIGuildMember,
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
        this.roles
          .add(`${roleData.guild_id}:${roleData.role.id}`, roleData.role)
          .catch(() => {});
        break;
      }
      case "GUILD_ROLE_UPDATE": {
        const roleData = data as GatewayGuildRoleUpdateDispatchData;
        this.roles
          .add(`${roleData.guild_id}:${roleData.role.id}`, roleData.role)
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
          this.emojis
            .add(`${emojiData.guild_id}:${emoji.id!}`, emoji)
            .catch(() => {});
        }
        break;
      }
      case "VOICE_STATE_UPDATE": {
        const vs = data as GatewayVoiceStateUpdateDispatchData;
        if (vs.guild_id) {
          this.voiceStates
            .add(`${vs.guild_id}:${vs.user_id}`, vs as unknown as APIVoiceState)
            .catch(() => {});
        }
        break;
      }
      case "USER_UPDATE": {
        const user = data as GatewayUserUpdateDispatchData;
        this.users.add(user.id, user as unknown as APIUser).catch(() => {});
        break;
      }
    }

    this.emit(event, data);

    if (event === "INTERACTION_CREATE") {
      this.interactions.handle(data as never).catch(() => {});
    }
  }
}
