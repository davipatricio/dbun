import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { HeartbeatManager } from "../heartbeat.js";

describe("HeartbeatManager", () => {
  let heartbeat: HeartbeatManager;

  beforeEach(() => {
    heartbeat = new HeartbeatManager();
  });

  afterEach(() => {
    heartbeat.stop();
  });

  describe("ack", () => {
    test("marks heartbeat as acknowledged", () => {
      heartbeat.ack();
      expect((heartbeat as any).acked).toBe(true);
    });
  });

  describe("getTimeSinceLastBeat", () => {
    test("returns time since last beat", async () => {
      const callback = mock(() => {});
      heartbeat.start(5, callback);
      await Bun.sleep(30);
      const time = heartbeat.getTimeSinceLastBeat();
      expect(time).toBeGreaterThanOrEqual(0);
      expect(time).toBeLessThan(100);
    });
  });

  describe("stop", () => {
    test("clears interval", () => {
      const callback = mock(() => {});
      heartbeat.start(10000, callback);
      heartbeat.stop();
      expect((heartbeat as any).interval).toBeNull();
    });

    test("can be called multiple times", () => {
      heartbeat.stop();
      heartbeat.stop();
    });
  });

  describe("debug messages", () => {
    test("emits debug on zombie heartbeat", async () => {
      const onDebug = mock(() => {});
      const hb = new HeartbeatManager(onDebug);
      hb.start(5, () => {});
      await Bun.sleep(50);
      hb.stop();
      expect(onDebug).toHaveBeenCalled();
    });
  });
});
