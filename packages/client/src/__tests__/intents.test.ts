import { describe, test, expect } from "bun:test";
import { Intents } from "../intents.js";
import { GatewayIntentBits } from "@dbun/types";

describe("Intents", () => {
  describe("add", () => {
    test("adds a single intent", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds);
      expect(intents.toBitfield()).toBe(GatewayIntentBits.Guilds);
    });

    test("adds multiple intents", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages);
      const expected = GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages;
      expect(intents.toBitfield()).toBe(expected);
    });

    test("is idempotent", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds);
      intents.add(GatewayIntentBits.Guilds);
      expect(intents.toBitfield()).toBe(GatewayIntentBits.Guilds);
    });

    test("returns this for chaining", () => {
      const intents = new Intents();
      const result = intents.add(GatewayIntentBits.Guilds);
      expect(result).toBe(intents);
    });
  });

  describe("remove", () => {
    test("removes an intent", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages);
      intents.remove(GatewayIntentBits.Guilds);
      expect(intents.toBitfield()).toBe(GatewayIntentBits.GuildMessages);
    });

    test("removing non-existent intent is safe", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds);
      intents.remove(GatewayIntentBits.GuildMessages);
      expect(intents.toBitfield()).toBe(GatewayIntentBits.Guilds);
    });
  });

  describe("has", () => {
    test("returns true for added intent", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds);
      expect(intents.has(GatewayIntentBits.Guilds)).toBe(true);
    });

    test("returns false for missing intent", () => {
      const intents = new Intents();
      expect(intents.has(GatewayIntentBits.Guilds)).toBe(false);
    });

    test("returns false after removal", () => {
      const intents = new Intents();
      intents.add(GatewayIntentBits.Guilds);
      intents.remove(GatewayIntentBits.Guilds);
      expect(intents.has(GatewayIntentBits.Guilds)).toBe(false);
    });
  });

  describe("toBitfield", () => {
    test("returns 0 for empty intents", () => {
      const intents = new Intents();
      expect(intents.toBitfield()).toBe(0);
    });

    test("returns correct bitfield for combined intents", () => {
      const intents = new Intents();
      intents.add(
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      );
      const expected =
        GatewayIntentBits.Guilds |
        GatewayIntentBits.GuildMessages |
        GatewayIntentBits.MessageContent;
      expect(intents.toBitfield()).toBe(expected);
    });
  });

  describe("from", () => {
    test("creates Intents from array", () => {
      const intents = Intents.from([GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]);
      expect(intents.has(GatewayIntentBits.Guilds)).toBe(true);
      expect(intents.has(GatewayIntentBits.GuildMessages)).toBe(true);
    });

    test("creates empty Intents from empty array", () => {
      const intents = Intents.from([]);
      expect(intents.toBitfield()).toBe(0);
    });
  });

  describe("Flags", () => {
    test("exposes GatewayIntentBits as Flags", () => {
      expect(Intents.Flags).toBe(GatewayIntentBits);
    });
  });
});
