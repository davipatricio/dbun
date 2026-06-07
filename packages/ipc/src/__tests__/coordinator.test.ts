import { describe, test, expect } from "bun:test";
import { Coordinator } from "../coordinator.js";
import type { IPCAdapter } from "../adapter.js";
import type { IPCMessage, ShardRange, WorkerMetadata } from "../types.js";
import type { ShardAssignment } from "../worker.js";

function createMockAdapter(): IPCAdapter & {
  messages: IPCMessage[];
  workers: Map<string, WorkerMetadata>;
  assignment: Map<string, ShardRange>;
  messageHandler: ((message: IPCMessage) => void) | null;
} {
  const adapter = {
    messages: [] as IPCMessage[],
    workers: new Map<string, WorkerMetadata>(),
    assignment: new Map<string, ShardRange>(),
    messageHandler: null as ((message: IPCMessage) => void) | null,

    async sendToWorker(_workerId: string, message: IPCMessage) {
      adapter.messages.push(message);
    },
    async sendToCoordinator(_message: IPCMessage) {},
    async broadcast(message: IPCMessage) {
      adapter.messages.push(message);
    },
    onMessage(handler: (message: IPCMessage) => void) {
      adapter.messageHandler = handler;
    },
    offMessage() {},
    async registerWorker(workerId: string, metadata: WorkerMetadata) {
      adapter.workers.set(workerId, metadata);
    },
    async unregisterWorker(workerId: string) {
      adapter.workers.delete(workerId);
    },
    async heartbeat(_workerId: string) {},
    async getWorkers() {
      return [...adapter.workers.values()];
    },
    async getShardAssignment() {
      return new Map(adapter.assignment);
    },
    async setShardAssignment(assignment: Map<string, ShardRange>) {
      adapter.assignment = assignment;
    },
    async connect() {},
    async disconnect() {},
  };
  return adapter;
}

const makeMetadata = (workerId: string): WorkerMetadata => ({
  workerId,
  hostname: "test",
  pid: 1,
  lastHeartbeat: Date.now(),
  startedAt: Date.now(),
});

function getAssignments(adapter: ReturnType<typeof createMockAdapter>) {
  return adapter.messages
    .filter((m) => m.type === "coordinator:assign")
    .map((m) => ({ workerId: m.workerId, assignment: m.data as ShardAssignment }));
}

describe("Coordinator", () => {
  test("starts and stops", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
    });
    await coordinator.start();
    await coordinator.stop();
  });

  test("assigns shards on worker register", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 10,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    const assigns = getAssignments(adapter);
    const w1 = assigns.find((a) => a.workerId === "w1");
    expect(w1).toBeDefined();
    expect(w1!.assignment.range).toEqual({ start: 0, end: 9 });
    expect(w1!.assignment.totalShards).toBe(10);

    await coordinator.stop();
  });

  test("distributes shards across multiple workers", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 10,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w2",
      data: makeMetadata("w2"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    const assigns = getAssignments(adapter);
    const w1 = [...assigns].reverse().find((a) => a.workerId === "w1");
    const w2 = [...assigns].reverse().find((a) => a.workerId === "w2");
    expect(w1!.assignment.range).toEqual({ start: 0, end: 4 });
    expect(w2!.assignment.range).toEqual({ start: 5, end: 9 });

    await coordinator.stop();
  });

  test("emits shard:event from workers", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 2,
      assignment: "auto",
    });

    const events: Array<{ shardId: number; event: string; data: unknown }> = [];
    coordinator.on("shard:event", (shardId, event, data) => {
      events.push({ shardId: shardId as number, event: event as string, data });
    });

    await coordinator.start();

    adapter.messageHandler!({
      type: "shard:event",
      workerId: "w1",
      shardId: 0,
      data: { event: "MESSAGE_CREATE", data: { content: "hello" } },
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    expect(events).toHaveLength(1);
    expect(events[0]!.shardId).toBe(0);
    expect(events[0]!.event).toBe("MESSAGE_CREATE");

    await coordinator.stop();
  });

  test("manual assignment", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 10,
      assignment: {
        "w1": { start: 0, end: 4 },
        "w2": { start: 5, end: 9, exclude: [7] },
      },
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w2",
      data: makeMetadata("w2"),
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    const assigns = getAssignments(adapter);
    const w1 = [...assigns].reverse().find((a) => a.workerId === "w1");
    const w2 = [...assigns].reverse().find((a) => a.workerId === "w2");
    expect(w1!.assignment.range).toEqual({ start: 0, end: 4 });
    expect(w2!.assignment.range).toEqual({ start: 5, end: 9, exclude: [7] });

    await coordinator.stop();
  });

  test("emits worker:join on worker ready", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 2,
      assignment: "auto",
    });

    const joins: string[] = [];
    coordinator.on("worker:join", (workerId) => {
      joins.push(workerId as string);
    });

    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:ready",
      workerId: "w1",
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    expect(joins).toEqual(["w1"]);

    await coordinator.stop();
  });

  test("getShardAssignment returns current assignment", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    const assignment = await coordinator.getShardAssignment();
    expect(assignment.size).toBe(1);
    expect(assignment.get("w1")).toEqual({ start: 0, end: 3 });

    await coordinator.stop();
  });

  test("getWorkerStatus returns worker info", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    const status = await coordinator.getWorkerStatus();
    expect(status.size).toBe(1);
    expect(status.has("w1")).toBe(true);
    expect(status.get("w1")!.alive).toBe(true);

    await coordinator.stop();
  });

  test("assign message includes totalShards", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 120,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    const assigns = getAssignments(adapter);
    expect(assigns[0]!.assignment.totalShards).toBe(120);

    await coordinator.stop();
  });

  test("handles worker unregister on timeout", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
      healthCheckInterval: 50,
      healthCheckTimeout: 50,
    });

    const leaves: string[] = [];
    coordinator.on("worker:leave", (workerId) => {
      leaves.push(workerId as string);
    });

    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: { ...makeMetadata("w1"), lastHeartbeat: Date.now() - 200 },
      timestamp: Date.now(),
    });
    await Bun.sleep(100);

    expect(leaves).toContain("w1");

    await coordinator.stop();
  });

  test("redistribute re-assigns all workers", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 10,
      assignment: "auto",
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w2",
      data: makeMetadata("w2"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    adapter.messages.length = 0;
    await coordinator.redistribute();
    await Bun.sleep(10);

    const assigns = getAssignments(adapter);
    expect(assigns.length).toBe(2);

    await coordinator.stop();
  });

  test("handles shard:ready event", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
    });

    const readyEvents: Array<{ shardId: number; workerId: string }> = [];
    coordinator.on("shard:ready", (shardId, workerId) => {
      readyEvents.push({ shardId: shardId as number, workerId: workerId as string });
    });

    await coordinator.start();

    adapter.messageHandler!({
      type: "shard:ready",
      workerId: "w1",
      shardId: 0,
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    expect(readyEvents).toHaveLength(1);
    expect(readyEvents[0]!.shardId).toBe(0);
    expect(readyEvents[0]!.workerId).toBe("w1");

    await coordinator.stop();
  });

  test("handles shard:error event", async () => {
    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 4,
      assignment: "auto",
    });

    const errors: Array<{ shardId: number; error: unknown }> = [];
    coordinator.on("shard:error", (shardId, error) => {
      errors.push({ shardId: shardId as number, error });
    });

    await coordinator.start();

    adapter.messageHandler!({
      type: "shard:error",
      workerId: "w1",
      shardId: 0,
      data: "connection failed",
      timestamp: Date.now(),
    });

    await Bun.sleep(10);

    expect(errors).toHaveLength(1);
    expect(errors[0]!.shardId).toBe(0);
    expect(errors[0]!.error).toBe("connection failed");

    await coordinator.stop();
  });

  test("custom strategy receives all worker IDs", async () => {
    const assignedWorkers: string[][] = [];
    const customStrategy = {
      assign(workerIds: string[], totalShards: number) {
        assignedWorkers.push([...workerIds]);
        const assignment = new Map<string, ShardRange>();
        const perWorker = Math.floor(totalShards / workerIds.length);
        let offset = 0;
        for (const id of workerIds) {
          assignment.set(id, { start: offset, end: offset + perWorker - 1 });
          offset += perWorker;
        }
        return assignment;
      },
    };

    const adapter = createMockAdapter();
    const coordinator = new Coordinator({
      adapter,
      token: "test-token",
      totalShards: 10,
      assignment: customStrategy,
    });
    await coordinator.start();

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w1",
      data: makeMetadata("w1"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    adapter.messageHandler!({
      type: "worker:register",
      workerId: "w2",
      data: makeMetadata("w2"),
      timestamp: Date.now(),
    });
    await Bun.sleep(10);

    expect(assignedWorkers.length).toBe(2);
    expect(assignedWorkers[0]).toEqual(["w1"]);
    expect(assignedWorkers[1]).toEqual(["w1", "w2"]);

    await coordinator.stop();
  });
});
