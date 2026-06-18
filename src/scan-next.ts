import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { NextScanOptions } from "./types.js";

const MANIFEST = "app-path-routes-manifest.json";

/**
 * Routes from a Next.js App Router build, read from the manifest Next writes
 * during `next build`. This is the authoritative route map, so there is no
 * filesystem globbing, source parsing, or regex involved. Requires a prior
 * build. Route groups and parallel slots are already resolved away by Next.
 * Dynamic `[param]` routes are skipped (nothing concrete to screenshot) unless
 * `includeDynamic`. `stripSegments: ["locale"]` removes an `[locale]` wrapper.
 */
export function scanNextAppRoutes(options: NextScanOptions = {}): string[] {
  const distDir = options.distDir ?? ".next";
  const manifestPath = join(distDir, MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `og-shot: ${manifestPath} not found. Run \`next build\` first, or set autoScan.distDir.`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  const ignore = options.ignore ?? ["/api"];
  const strip = options.stripSegments ?? [];
  const includeDynamic = options.includeDynamic ?? false;

  const routes = new Set<string>();
  for (const value of Object.values(manifest)) {
    if (typeof value !== "string") continue;

    let route = value;
    for (const segment of strip) route = route.split(`/[${segment}]`).join("");
    if (route === "") route = "/";

    if (route.includes("/_")) continue;
    if (ignore.some((p) => route === p || route.startsWith(p.endsWith("/") ? p : `${p}/`))) {
      continue;
    }
    if (!includeDynamic && route.includes("[")) continue;

    routes.add(route);
  }
  return [...routes].sort();
}
