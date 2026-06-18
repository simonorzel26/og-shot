import { join } from "node:path";
import { scanNextAppRoutes } from "./scan-next.js";
import type {
  Environment,
  LocalePrefix,
  OgShotConfig,
  Resolution,
  RouteObject,
  RunOptions,
  Target,
} from "./types.js";

const DEFAULT_RESOLUTION: Resolution = { width: 1200, height: 630 };

function pickBaseUrl(config: OgShotConfig, options: RunOptions): string {
  if (options.baseUrlOverride) return stripTrailingSlash(options.baseUrlOverride);
  if (typeof config.baseUrl === "string") return stripTrailingSlash(config.baseUrl);

  const env: Environment =
    options.environment ?? config.defaultEnvironment ?? "production";
  const url = config.baseUrl[env];
  if (!url) {
    const available = Object.keys(config.baseUrl).join(", ") || "none";
    throw new Error(
      `og-shot: no baseUrl configured for environment "${env}" (have: ${available}).`,
    );
  }
  return stripTrailingSlash(url);
}

function stripTrailingSlash(url: string): string {
  let result = url;
  while (result.endsWith("/")) result = result.slice(0, -1);
  return result;
}

function slugFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length === 0 ? "home" : parts.join("-");
}

function normalizeRoute(input: string | RouteObject): RouteObject {
  if (typeof input === "string") return { slug: slugFromPath(input), path: input };
  return input;
}

function applyLocalePrefix(
  path: string,
  locale: string,
  defaultLocale: string,
  strategy: LocalePrefix,
): string {
  if (typeof strategy === "function") return strategy(path, locale);
  if (strategy === "as-needed" && locale === defaultLocale) return path;
  const base = path === "/" ? "" : path;
  return `/${locale}${base}`;
}

function mergeResolution(
  global: Resolution,
  override?: Partial<Resolution>,
): Target["resolution"] {
  const r = { ...global, ...override };
  return {
    width: r.width,
    height: r.height,
    captureWidth: r.captureWidth ?? r.width,
    captureHeight: r.captureHeight ?? r.height,
    deviceScaleFactor: r.deviceScaleFactor ?? 1,
  };
}

function matches(target: { slug: string; url: string }, only: string[]): boolean {
  return only.some((q) => target.slug.includes(q) || target.url.includes(q));
}

function extension(config: OgShotConfig): string {
  return config.output?.format === "jpeg" ? ".jpg" : ".png";
}

function fileName(template: string, slug: string, locale: string | null): string {
  const filled = template.split("{slug}").join(slug).split("{locale}").join(locale ?? "");
  return filled.split("-").filter(Boolean).join("-");
}

/**
 * Expand config + run options into the full, deduplicated list of images to
 * produce. Pure: no IO beyond reading the route filesystem for autoScan.
 */
export function resolveTargets(config: OgShotConfig, options: RunOptions = {}): Target[] {
  const baseUrl = pickBaseUrl(config, options);
  const globalResolution = config.resolution ?? DEFAULT_RESOLUTION;
  const locales = config.locales && config.locales.length > 0 ? config.locales : [null];
  const localeFilter = options.locales;
  const defaultLocale = config.defaultLocale ?? config.locales?.[0] ?? "";
  const strategy = config.localePrefix ?? "as-needed";
  const ext = extension(config);
  const template = config.filename ?? (config.locales ? "{slug}-{locale}" : "{slug}");

  const scanned: RouteObject[] = config.autoScan
    ? scanNextAppRoutes(config.autoScan === true ? {} : config.autoScan).map((p) => ({
        slug: slugFromPath(p),
        path: p,
      }))
    : [];

  // Explicit routes win over scanned ones with the same slug.
  const bySlug = new Map<string, RouteObject>();
  for (const r of scanned) bySlug.set(r.slug, r);
  for (const r of (config.routes ?? []).map(normalizeRoute)) bySlug.set(r.slug, r);

  const targets: Target[] = [];
  for (const route of bySlug.values()) {
    for (const locale of locales) {
      if (localeFilter && locale && !localeFilter.includes(locale)) continue;

      const path = resolvePath(route, locale, defaultLocale, strategy);
      if (path === null) continue; // explicitly skipped for this locale

      const url = baseUrl + path;
      const resolution = mergeResolution(globalResolution, route.resolution);
      const outPath = join(config.outDir, fileName(template, route.slug, locale) + ext);
      const target: Target = { slug: route.slug, locale, url, outPath, resolution };

      if (options.only && !matches(target, options.only)) continue;
      targets.push(target);
    }
  }
  return targets;
}

function resolvePath(
  route: RouteObject,
  locale: string | null,
  defaultLocale: string,
  strategy: LocalePrefix,
): string | null {
  if (route.paths) {
    if (locale === null) {
      const only = Object.values(route.paths)[0];
      return only ?? null;
    }
    const explicit = route.paths[locale];
    return explicit === undefined ? null : explicit;
  }
  if (route.path === undefined) {
    throw new Error(`og-shot: route "${route.slug}" has neither "path" nor "paths".`);
  }
  if (locale === null) return route.path;
  return applyLocalePrefix(route.path, locale, defaultLocale, strategy);
}
