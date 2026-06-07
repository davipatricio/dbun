import { fetchGatewayInfo } from "@dbun/ws/gateway-url";
import type { IPCAdapter } from "./adapter.js";
import type {
  IPCMessage,
  ShardRange,
  WorkerMetadata,
  WorkerStatus,
  ShardEventMessage,
} from "./types.js";
import { RoundRobinStrategy, ManualStrategy, type AssignmentStrategy } from "./strategies.js";
import type { ShardAssignment } from "./worker.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export interface CoordinatorOptions {
  adapter: IPCAdapter;
  token: string;
  totalShards?: number | "auto";
  assignment?: "auto" | Record<string, ShardRange> | AssignmentStrategy;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  maxConcurrency?: number;
}

export class Coordinator {
  private adapter: IPCAdapter;
  private token: string;
  private totalShards: number;
  private totalShardsOption: number | "auto";
  private assignmentMode: AssignmentStrategy;
  private manualAssignment: Map<string, ShardRange> | null;
  private healthCheckInterval: number;
  private healthCheckTimeout: number;
  private maxConcurrency: number;
  private handlers = new Map<string, Set<EventHandler>>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  constructor(options: CoordinatorOptions) {
    this.adapter = options.adapter;
    this.token = options.token;
    this.totalShardsOption = options.totalShards ?? "auto";
    this.totalShards = typeof options.totalShards === "number" ? options.totalShards : 1;
    this.maxConcurrency = options.maxConcurrency ?? 50;
    this.healthCheckInterval = options.healthCheckInterval ?? 15_000;
    this.healthCheckTimeout = options.healthCheckTimeout ?? 45_000;

    if (options.assignment === "auto" || options.assignment === undefined) {
      this.assignmentMode = new RoundRobinStrategy();
      this.manualAssignment = null;
    } else if (typeof options.assignment === "object" && "assign" in options.assignment) {
      this.assignmentMode = options.assignment as AssignmentStrategy;
      this.manualAssignment = null;
    } else {
      this.assignmentMode = new ManualStrategy(options.assignment);
      this.manualAssignment = new Map(Object.entries(options.assignment));
    }
  }

  on(event: string, handler: EventHandler): this {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(...args);
      } catch {
        /* ignore handler errors */
      }
    }
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.adapter.connect();

    if (this.totalShardsOption === "auto") {
      this.emit("debug", "Fetching recommended shard count from /gateway/bot");
      const info = await fetchGatewayInfo(this.token);
      this.totalShards = info.shards;
      this.maxConcurrency = info.session_start_limit.max_concurrency;
      this.emit(
        "debug",
        `Auto shard count: ${this.totalShards} (concurrency: ${this.maxConcurrency})`,
      );
    } else {
      this.emit("debug", `Starting coordinator (totalShards=${this.totalShards})`);
    }

    this.adapter.onMessage((message) => this.handleMessage(message));

    this.healthTimer = setInterval(() => {
      this.checkWorkerHealth().catch(() => {});
    }, this.healthCheckInterval);

    this.emit("debug", "Coordinator started");
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;

    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    await this.adapter.disconnect();
    this.emit("debug", "Coordinator stopped");
  }

  private async handleMessage(message: IPCMessage): Promise<void> {
    switch (message.type) {
      case "worker:register":
        await this.handleWorkerRegister(message);
        break;
      case "worker:heartbeat":
        await this.adapter.heartbeat(message.workerId);
        break;
      case "worker:ready":
        this.emit("worker:join", message.workerId);
        break;
      case "shard:ready":
        this.emit("shard:ready", message.shardId, message.workerId);
        break;
      case "shard:event": {
        const data = message.data as ShardEventMessage;
        this.emit("shard:event", message.shardId, data.event, data.data);
        break;
      }
      case "shard:error":
        this.emit("shard:error", message.shardId, message.data);
        break;
      case "shard:status":
        this.emit(
          "debug",
          `Shard ${message.shardId} status: ${(message.data as { status: string }).status}`,
        );
        break;
    }
  }

  private async handleWorkerRegister(message: IPCMessage): Promise<void> {
    const metadata = message.data as WorkerMetadata;
    await this.adapter.registerWorker(message.workerId, metadata);

    this.emit("debug", `Worker ${message.workerId} registered`);

    await this.assignShards();
  }

  private async assignShards(): Promise<void> {
    const workers = await this.adapter.getWorkers();
    const workerIds = workers.map((w) => w.workerId);

    if (workerIds.length === 0) return;

    let assignment: Map<string, ShardRange>;

    if (this.manualAssignment) {
      assignment = new Map();
      for (const workerId of workerIds) {
        const range = this.manualAssignment.get(workerId);
        if (range) {
          assignment.set(workerId, range);
        }
      }
    } else {
      assignment = this.assignmentMode.assign(workerIds, this.totalShards, this.maxConcurrency);
    }

    await this.adapter.setShardAssignment(assignment);

    for (const [workerId, range] of assignment) {
      const shardAssignment: ShardAssignment = {
        range,
        totalShards: this.totalShards,
      };
      await this.adapter.sendToWorker(workerId, {
        type: "coordinator:assign",
        workerId,
        data: shardAssignment,
        timestamp: Date.now(),
      });
    }

    this.emit("debug", `Assigned shards to ${assignment.size} workers`);
  }

  private async checkWorkerHealth(): Promise<void> {
    const workers = await this.adapter.getWorkers();
    const now = Date.now();

    for (const worker of workers) {
      if (now - worker.lastHeartbeat > this.healthCheckTimeout) {
        this.emit("debug", `Worker ${worker.workerId} timed out`);
        await this.adapter.unregisterWorker(worker.workerId);
        this.emit("worker:leave", worker.workerId);
        await this.assignShards();
      }
    }
  }

  async redistribute(): Promise<void> {
    await this.assignShards();
  }

  async getShardAssignment(): Promise<Map<string, ShardRange>> {
    return this.adapter.getShardAssignment();
  }

  async getWorkerStatus(): Promise<Map<string, WorkerStatus>> {
    const workers = await this.adapter.getWorkers();
    const assignment = await this.adapter.getShardAssignment();
    const now = Date.now();
    const statusMap = new Map<string, WorkerStatus>();

    for (const worker of workers) {
      const range = assignment.get(worker.workerId);
      statusMap.set(worker.workerId, {
        workerId: worker.workerId,
        hostname: worker.hostname,
        pid: worker.pid,
        shardRange: range,
        shardCount: range ? range.end - range.start + 1 - (range.exclude?.length ?? 0) : 0,
        connectedShards: 0,
        lastHeartbeat: worker.lastHeartbeat,
        uptime: now - worker.startedAt,
        alive: now - worker.lastHeartbeat < this.healthCheckTimeout,
      });
    }

    return statusMap;
  }
}
