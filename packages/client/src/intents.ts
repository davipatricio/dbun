import { GatewayIntentBits } from "@dbun/types";

export class Intents {
  private bits: number = 0;

  add(...intents: GatewayIntentBits[]): this {
    for (const intent of intents) {
      this.bits |= intent;
    }
    return this;
  }

  remove(...intents: GatewayIntentBits[]): this {
    for (const intent of intents) {
      this.bits &= ~intent;
    }
    return this;
  }

  has(intent: GatewayIntentBits): boolean {
    return (this.bits & intent) === intent;
  }

  toBitfield(): number {
    return this.bits;
  }

  static from(intents: GatewayIntentBits[]): Intents {
    const intentsBuilder = new Intents();
    return intentsBuilder.add(...intents);
  }

  static readonly Flags = GatewayIntentBits;
}
