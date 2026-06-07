import { describe, test, expect } from "bun:test";
import { Permissions } from "../permissions.js";
import { PermissionFlagsBits } from "@dbun/types";

describe("Permissions", () => {
  describe("constructor", () => {
    test("accepts bigint", () => {
      const perms = new Permissions(PermissionFlagsBits.Administrator);
      expect(perms.has(PermissionFlagsBits.Administrator)).toBe(true);
    });

    test("accepts string", () => {
      const perms = new Permissions(String(PermissionFlagsBits.Administrator));
      expect(perms.has(PermissionFlagsBits.Administrator)).toBe(true);
    });
  });

  describe("has", () => {
    test("returns true for granted permission", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel);
      expect(perms.has(PermissionFlagsBits.SendMessages)).toBe(true);
    });

    test("returns false for missing permission", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages);
      expect(perms.has(PermissionFlagsBits.Administrator)).toBe(false);
    });

    test("returns true when multiple bits are set", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel);
      expect(perms.has(PermissionFlagsBits.SendMessages)).toBe(true);
      expect(perms.has(PermissionFlagsBits.ViewChannel)).toBe(true);
    });
  });

  describe("any", () => {
    test("returns true if at least one permission matches", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages);
      expect(perms.any(PermissionFlagsBits.SendMessages, PermissionFlagsBits.Administrator)).toBe(true);
    });

    test("returns false if no permissions match", () => {
      const perms = new Permissions(PermissionFlagsBits.ViewChannel);
      expect(perms.any(PermissionFlagsBits.Administrator, PermissionFlagsBits.BanMembers)).toBe(false);
    });
  });

  describe("all", () => {
    test("returns true if all permissions match", () => {
      const perms = new Permissions(
        PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel,
      );
      expect(perms.all(PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel)).toBe(true);
    });

    test("returns false if not all permissions match", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages);
      expect(perms.all(PermissionFlagsBits.SendMessages, PermissionFlagsBits.Administrator)).toBe(false);
    });
  });

  describe("toArray", () => {
    test("returns matching permission flags", () => {
      const perms = new Permissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel);
      const arr = perms.toArray();
      expect(arr).toContain(PermissionFlagsBits.SendMessages);
      expect(arr).toContain(PermissionFlagsBits.ViewChannel);
    });

    test("returns empty array for zero permissions", () => {
      const perms = new Permissions(0n);
      expect(perms.toArray()).toEqual([]);
    });
  });

  describe("toString", () => {
    test("returns string representation of bits", () => {
      const perms = new Permissions(4n);
      expect(perms.toString()).toBe("4");
    });
  });

  describe("toJSON", () => {
    test("returns string representation of bits", () => {
      const perms = new Permissions(1024n);
      expect(perms.toJSON()).toBe("1024");
    });
  });
});
