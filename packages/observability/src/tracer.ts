export interface TracerOptions {
  serviceName?: string;
  enabled?: boolean;
  onDebug?: (message: string) => void;
}

export class DBunTracer {
  private enabled: boolean;
  private serviceName: string;
  private onDebug?: (message: string) => void;

  constructor(options?: TracerOptions) {
    this.enabled = options?.enabled ?? true;
    this.serviceName = options?.serviceName ?? "@dbun/client";
    this.onDebug = options?.onDebug;
  }

  async startSpan<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    if (!this.enabled) {
      return fn();
    }

    const startTime = performance.now();
    try {
      const result = await fn();
      this.recordSpan(name, startTime, true);
      return result;
    } catch (error) {
      this.recordSpan(name, startTime, false);
      throw error;
    }
  }

  private recordSpan(name: string, startTime: number, success: boolean): void {
    const duration = performance.now() - startTime;
    this.onDebug?.(`[Tracer] ${name} completed in ${duration.toFixed(2)}ms (success: ${success})`);
  }
}
