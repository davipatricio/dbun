import { describe, test, expect, beforeEach } from "bun:test";
import { AutocompleteRouter } from "../autocomplete.js";

describe("AutocompleteRouter", () => {
  let router: AutocompleteRouter;

  beforeEach(() => {
    router = new AutocompleteRouter();
  });

  describe("register + handle", () => {
    test("calls handler for registered option", async () => {
      router.register("color", (value) => [
        { name: `${value}-red`, value: "red" },
        { name: `${value}-blue`, value: "blue" },
      ]);
      const result = await router.handle("color", "pick");
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("pick-red");
    });

    test("returns empty for unregistered option", async () => {
      const result = await router.handle("unknown", "val");
      expect(result).toEqual([]);
    });

    test("passes value to handler", async () => {
      let received: string | undefined;
      router.register("opt", (value) => {
        received = value;
        return [];
      });
      await router.handle("opt", "hello");
      expect(received).toBe("hello");
    });
  });

  describe("chaining", () => {
    test("register returns this", () => {
      expect(router.register("a", () => [])).toBe(router);
    });
  });
});
