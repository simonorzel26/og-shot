import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NextScanOptions } from "./types.js";

const PAGE_FILE = /^page\.(tsx|ts|jsx|js|mdx)$/;
const ROUTE_GROUP = /^\(.+\)$/; // (marketing) — does not affect the URL
const PARALLEL_SLOT = /^@/; // @modal — does not affect the URL
const DYNAMIC = /^\[.+\]$/; // [slug], [[...all]], [...all]

/**
 * Walk a Next.js App Router directory and return the static route paths that
 * have a page file. Route groups `(group)` and parallel slots `@slot` are
 * stripped from the URL. Dynamic `[param]` segments are skipped by default
 * (there is nothing concrete to screenshot); list them explicitly in config
 * instead. `stripSegments` removes a named dynamic segment from the path
 * rather than skipping it (use for an `app/[locale]/...` root).
 */
export function scanNextAppRoutes(options: NextScanOptions = {}): string[] {
  const appDir = options.appDir ?? "app";
  const ignore = new Set(options.ignore ?? ["api"]);
  const strip = new Set((options.stripSegments ?? []).map((s) => `[${s}]`));
  const includeDynamic = options.includeDynamic ?? false;

  if (!existsSync(appDir)) {
    throw new Error(
      `og-shot: autoScan could not find the app directory "${appDir}". Set autoScan.appDir.`,
    );
  }

  const routes: string[] = [];

  const walk = (dir: string, segments: string[]): void => {
    const entries = readdirSync(dir);

    if (entries.some((e) => PAGE_FILE.test(e))) {
      routes.push(segments.length === 0 ? "/" : "/" + segments.join("/"));
    }

    for (const entry of entries) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry.startsWith("_") || ignore.has(entry)) continue;

      if (ROUTE_GROUP.test(entry) || PARALLEL_SLOT.test(entry)) {
        walk(full, segments); // transparent to the URL
        continue;
      }
      if (strip.has(entry)) {
        walk(full, segments); // e.g. [locale] — handled by locale fan-out
        continue;
      }
      if (DYNAMIC.test(entry) && !includeDynamic) continue;

      walk(full, [...segments, entry]);
    }
  };

  walk(appDir, []);
  return [...new Set(routes)].sort();
}
