import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  deps: {
    neverBundle: [
      "@dbun/types",
      "@dbun/rest",
      "@dbun/ws",
      "@dbun/cache",
      "@dbun/structures",
      "@dbun/interactions",
      "@dbun/observability",
    ],
  },
});
