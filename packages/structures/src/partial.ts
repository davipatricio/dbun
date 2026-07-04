import type { ClientContext } from "./context.js";

export class PartialStructure<T extends { id: string }> {
  protected data: Partial<T>;
  protected context?: ClientContext;
  readonly id: string;
  readonly partial = true;

  constructor(data: Partial<T>, context?: ClientContext) {
    this.data = data;
    this.context = context;
    this.id = data.id!;
  }

  _patch(data: Partial<T>): void {
    Object.assign(this.data, data);
  }

  toJSON(): Partial<T> {
    return this.data;
  }
}
