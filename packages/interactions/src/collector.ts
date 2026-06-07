import type { APIInteraction } from "@dbun/types";

export interface CollectorOptions {
  time?: number;
  max?: number;
}

export type CollectorFilter = (interaction: APIInteraction) => boolean;

export class ComponentCollector {
  private filter: CollectorFilter;
  private options: CollectorOptions;
  private _collected: APIInteraction[] = [];
  private _endReason: string | null = null;
  private resolvePromise: ((value: APIInteraction[]) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(filter: CollectorFilter, options?: CollectorOptions) {
    this.filter = filter;
    this.options = options ?? {};
  }

  collect(interaction: APIInteraction): boolean {
    if (this._endReason) return false;
    if (!this.filter(interaction)) return false;

    this._collected.push(interaction);

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
