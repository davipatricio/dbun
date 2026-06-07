import type { IPCAdapter, WorkerThreadsAdapterOptions } from "../adapter.js";
import type { IPCMessage, ShardRange, WorkerMetadata } from "../types.js";

declare const self:
  | { postMessage: (data: unknown) => void; onmessage: ((event: MessageEvent) => void) | null }
  | undefined;

type WorkerLike = {
  postMessage(message: unknown): void;
  on(event: "message", handler: (data: unknown) => void): void;
  on(event: "error", handler: (err: Error) => void): void;
  terminate(): Promise<number>;
};

export class WorkerThreadsAdapter implements IPCAdapter {
  private workers = new Map<string, WorkerLike>();
  private messageHandlers = new Set<(message: IPCMessage) => void>();
  private workerMetadata = new Map<string, WorkerMetadata>();
  private assignment = new Map<string, ShardRange>();
  private workerScript: string;
  private isCoordinator: boolean;
  private coordinatorHandler: ((message: IPCMessage) => void) | null = null;

  constructor(options: WorkerThreadsAdapterOptions & { isCoordinator?: boolean }) {
    this.workerScript = options.workerScript;
    this.isCoordinator = options.isCoordinator ?? true;
  }

  async connect(): Promise<void> {
    if (!this.isCoordinator) {
      if (typeof self !== "undefined" && self && "onmessage" in self) {
        self.onmessage = (event: MessageEvent) => {
          const message = event.data as IPCMessage;
          for (const handler of this.messageHandlers) {
            handler(message);
          }
        };
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isCoordinator) {
      for (const worker of this.workers.values()) {
        await worker.terminate();
      }
    }
    this.workers.clear();
    this.messageHandlers.clear();
    this.workerMetadata.clear();
  }

  async sendToWorker(workerId: string, message: IPCMessage): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.postMessage(message);
    }
  }

  async sendToCoordinator(message: IPCMessage): Promise<void> {
    if (this.coordinatorHandler) {
      this.coordinatorHandler(message);
    } else if (typeof self !== "undefined" && self && "postMessage" in self) {
      self.postMessage(message);
    }
  }

  async broadcast(message: IPCMessage): Promise<void> {
    for (const worker of this.workers.values()) {
      worker.postMessage(message);
    }
  }

  onMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: IPCMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  onCoordinatorMessage(handler: (message: IPCMessage) => void): void {
    this.coordinatorHandler = handler;
  }

  async registerWorker(workerId: string, metadata: WorkerMetadata): Promise<void> {
    this.workerMetadata.set(workerId, metadata);
  }

  async unregisterWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      await worker.terminate();
      this.workers.delete(workerId);
    }
    this.workerMetadata.delete(workerId);
    this.assignment.delete(workerId);
  }

  async heartbeat(_workerId: string): Promise<void> {}

  async getWorkers(): Promise<WorkerMetadata[]> {
    return [...this.workerMetadata.values()];
  }

  async getShardAssignment(): Promise<Map<string, ShardRange>> {
    return new Map(this.assignment);
  }

  async setShardAssignment(assignment: Map<string, ShardRange>): Promise<void> {
    this.assignment = assignment;
  }

  async spawnWorker(workerId: string): Promise<void> {
    const worker = new Worker(this.workerScript, {
      type: "module",
    }) as unknown as WorkerLike;

    worker.on("message", (data: unknown) => {
      const message = data as IPCMessage;
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    });

    worker.on("error", () => {});

    this.workers.set(workerId, worker);
  }

  setupWorkerListener(): void {
    if (typeof self !== "undefined" && self && "onmessage" in self) {
      self.onmessage = (event: MessageEvent) => {
        const message = event.data as IPCMessage;
        for (const handler of this.messageHandlers) {
          handler(message);
        }
      };
    }
  }

  getWorker(workerId: string): WorkerLike | undefined {
    return this.workers.get(workerId);
  }
}
