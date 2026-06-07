export class HeartbeatManager {
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastBeat = 0;
  private acked = true;
  private heartbeatInterval = 0;
  private callback: (() => void) | null = null;
  private onDebug?: (message: string) => void;

  constructor(onDebug?: (message: string) => void) {
    this.onDebug = onDebug;
  }

  start(interval: number, callback: () => void): void {
    this.stop();
    this.heartbeatInterval = interval;
    this.callback = callback;

    const jitter = Math.random();
    const delay = interval * jitter;

    setTimeout(() => {
      this.callback?.();
      this.lastBeat = Date.now();
      this.acked = true;

      this.interval = setInterval(() => {
        if (!this.acked) {
          this.onDebug?.("Heartbeat not acknowledged, reconnecting...");
          this.stop();
          return;
        }
        this.callback?.();
        this.lastBeat = Date.now();
        this.acked = false;
      }, interval);
    }, delay);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.acked = true;
  }

  ack(): void {
    this.acked = true;
  }

  getTimeSinceLastBeat(): number {
    return Date.now() - this.lastBeat;
  }
}
