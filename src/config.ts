import type { OgShotConfig } from "./types.js";

/**
 * Identity helper that gives full type-checking and editor completion in an
 * `og.config.ts`. Returns the config unchanged.
 */
export function defineConfig(config: OgShotConfig): OgShotConfig {
  return config;
}
