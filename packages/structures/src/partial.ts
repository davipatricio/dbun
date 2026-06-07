export class PartialStructure<T extends { id: string }> {
  protected data: Partial<T>;
  readonly id: string;
  readonly partial = true;

  constructor(data: Partial<T>) {
    this.data = data;
    this.id = data.id!;
  }

  toJSON(): Partial<T> {
    return this.data;
  }
}
