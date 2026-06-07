import type { ClientContext } from "./context.js";

export abstract class BaseStructure<T> {
  protected data: T;
  protected context?: ClientContext;
  readonly id: string;

  constructor(data: T, context?: ClientContext) {
    this.data = data;
    this.context = context;
    this.id = (data as Record<string, unknown>).id as string;
  }

  toJSON(): T {
    return this.data;
  }

  valueOf(): string {
    return this.id;
  }
}
