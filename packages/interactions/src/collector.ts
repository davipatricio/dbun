import type { APIInteraction } from "@dbun/types";

export interface CollectorOptions {
  time?: number;
  idle?: number;
  max?: number;
}

export type CollectorFilter = (interaction: APIInteraction) => boolean;

type EventCallback = (...args: unknown[]) => void;

export class ComponentCollector {
  private filter: CollectorFilter;
  private options: CollectorOptions;
  private _collected: APIInteraction[] = [];
  private _endReason: string | null = null;
  private resolvePromise: ((value: APIInteraction[]) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, EventCallback[]>();

  constructor(filter: CollectorFilter, options?: CollectorOptions) {
    this.filter = filter;
    this.options = options ?? {};
  }

  on(event: "collect", callback: (interaction: APIInteraction) => void): this;
  on(event: "end", callback: (collected: APIInteraction[], reason: string) => void): this;
  on(event: string, callback: (...args: never[]) => void): this {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(callback as EventCallback);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, callback: EventCallback): this {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    }
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        cb(...args);
      }
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.options.idle) {
      this.idleTimer = setTimeout(() => {
        this.stop("idle");
      }, this.options.idle);
    }
  }

  collect(interaction: APIInteraction): boolean {
    if (this._endReason) return false;
    if (!this.filter(interaction)) return false;

    this._collected.push(interaction);
    this.emit("collect", interaction);
    this.resetIdleTimer();

    if (this.options.max && this._collected.length >= this.options.max) {
      this.stop("limit");
    }

    return true;
  }

  stop(reason = "user"): void {
    if (this._endReason) return;
    this._endReason = reason;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.emit("end", [...this._collected], reason);
    this.resolvePromise?.(this._collected);
    this.resolvePromise = null;
  }

  async await(): Promise<APIInteraction[]> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;

      if (this.options.time) {
        this.timer = setTimeout(() => {
          this.stop("time");
        }, this.options.time);
      }

      this.resetIdleTimer();
    });
  }

  get collected(): APIInteraction[] {
    return [...this._collected];
  }

  get ended(): boolean {
    return this._endReason !== null;
  }

  get endReason(): string | null {
    return this._endReason;
  }
}
