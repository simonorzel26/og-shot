import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  target: "node18",
  dts: true,
  clean: true,
  minify: true,
  sourcemap: false,
  shims: false,
});
