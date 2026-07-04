import type { ClientContext } from "./context.js";

export abstract class BaseStructure<T extends object> {
  protected data: T;
  protected context?: ClientContext;
  readonly id: string;
  partial = false;

  constructor(data: T, context?: ClientContext) {
    this.data = data;
    this.context = context;
    this.id = (data as Record<string, unknown>).id as string;
  }

  _patch(data: Partial<T>): void {
    Object.assign(this.data, data);
  }

  toJSON(): T {
    return this.data;
  }

  valueOf(): string {
    return this.id;
  }
}
