export class DBunMetrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  incrementCounter(name: string, value = 1): void {
    const current = this.counters.get(name) ?? 0;
    this.counters.set(name, current + value);
  }

  recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) ?? [];
    values.push(value);
    this.histograms.set(name, values);
  }

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  getHistogram(name: string): { min: number; max: number; avg: number; count: number } {
    const values = this.histograms.get(name) ?? [];
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { min, max, avg, count: values.length };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}
