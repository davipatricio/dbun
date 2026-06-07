import type { ShardRange } from "./types.js";

export interface AssignmentStrategy {
  assign(
    workerIds: string[],
    totalShards: number,
    maxConcurrency?: number,
  ): Map<string, ShardRange>;
}

export class RoundRobinStrategy implements AssignmentStrategy {
  assign(workerIds: string[], totalShards: number): Map<string, ShardRange> {
    const assignment = new Map<string, ShardRange>();
    if (workerIds.length === 0 || totalShards === 0) return assignment;

    const shardsPerWorker = Math.floor(totalShards / workerIds.length);
    const remainder = totalShards % workerIds.length;

    let offset = 0;
    for (let i = 0; i < workerIds.length; i++) {
      const count = shardsPerWorker + (i < remainder ? 1 : 0);
      if (count <= 0) break;
      const workerId = workerIds[i]!;
      assignment.set(workerId, {
        start: offset,
        end: offset + count - 1,
      });
      offset += count;
    }

    return assignment;
  }
}

export class ManualStrategy implements AssignmentStrategy {
  private readonly ranges: Map<string, ShardRange>;

  constructor(ranges: Record<string, ShardRange> | Map<string, ShardRange>) {
    this.ranges = ranges instanceof Map ? ranges : new Map(Object.entries(ranges));
  }

  assign(workerIds: string[], _totalShards?: number): Map<string, ShardRange> {
    const assignment = new Map<string, ShardRange>();
    for (const workerId of workerIds) {
      const range = this.ranges.get(workerId);
      if (range) {
        assignment.set(workerId, range);
      }
    }
    return assignment;
  }
}

export function expandRange(range: ShardRange): number[] {
  const ids: number[] = [];
  const excluded = new Set(range.exclude ?? []);
  for (let i = range.start; i <= range.end; i++) {
    if (!excluded.has(i)) {
      ids.push(i);
    }
  }
  return ids;
}
