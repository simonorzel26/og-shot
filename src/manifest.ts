import { writeFile, mkdir } from "node:fs/promises";
import { dirname, basename, join } from "node:path";
import type { OgShotConfig, TargetResult } from "./types.js";

/** Map of slug -> locale -> served image URL, for the cards that exist. */
export type Manifest = Record<string, Record<string, string>>;

/**
 * The URL prefix the images are served from. Defaults to `outDir` with a
 * leading `public/` stripped (the Next.js convention: public/og -> /og).
 */
export function publicPathFor(config: OgShotConfig): string {
  if (config.publicPath) {
    let p = config.publicPath;
    while (p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }
  const parts = config.outDir.split("/").filter((part) => part !== "" && part !== ".");
  const publicIdx = parts.lastIndexOf("public");
  const rel = publicIdx >= 0 ? parts.slice(publicIdx + 1) : parts;
  return "/" + rel.join("/");
}

function manifestPath(config: OgShotConfig): string {
  return config.manifest === true
    ? join(config.outDir, "og-manifest.json")
    : String(config.manifest);
}

/**
 * Build a manifest from the captures that succeeded and write it as JSON.
 * Only successful targets are listed, so a missing locale (e.g. an untranslated
 * page set to `null`) is simply absent and the app can fall back to a default.
 */
export async function writeManifest(
  results: TargetResult[],
  config: OgShotConfig,
): Promise<string | null> {
  if (!config.manifest) return null;
  const base = publicPathFor(config);

  const manifest: Manifest = {};
  for (const r of results) {
    if (r.status !== "ok") continue;
    const { slug, locale, outPath } = r.target;
    (manifest[slug] ??= {})[locale ?? "default"] = `${base}/${basename(outPath)}`;
  }

  const sorted: Manifest = {};
  for (const key of Object.keys(manifest).sort()) sorted[key] = manifest[key];

  const path = manifestPath(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(sorted, null, 2) + "\n");
  return path;
}
