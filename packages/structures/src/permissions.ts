import { PermissionFlagsBits } from "@dbun/types";

export class Permissions {
  private bits: bigint;

  constructor(permissions: string | bigint) {
    this.bits = typeof permissions === "string" ? BigInt(permissions) : permissions;
  }

  has(permission: bigint): boolean {
    return (this.bits & permission) === permission;
  }

  any(...permissions: bigint[]): boolean {
    return permissions.some((p) => this.has(p));
  }

  all(...permissions: bigint[]): boolean {
    return permissions.every((p) => this.has(p));
  }

  toArray(): bigint[] {
    const result: bigint[] = [];
    for (const [, value] of Object.entries(PermissionFlagsBits)) {
      if (this.has(value)) {
        result.push(value);
      }
    }
    return result;
  }

  toString(): string {
    return this.bits.toString();
  }

  toJSON(): string {
    return this.bits.toString();
  }
}
