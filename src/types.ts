export type Environment = "production" | "development" | "local";

export interface Resolution {
  /** Final OG image width in px (what gets written to disk). */
  width: number;
  /** Final OG image height in px. */
  height: number;
  /**
   * Browser viewport width used for the capture, before downscaling to
   * `width`. A wider viewport makes higher CSS breakpoints apply and yields
   * crisper downscaled text. Defaults to `width` (no downscale).
   */
  captureWidth?: number;
  /** Browser viewport height for the capture. Defaults to `height`. */
  captureHeight?: number;
  /** Retina multiplier applied on top of the viewport. Default 1. */
  deviceScaleFactor?: number;
}

export interface OutputOptions {
  /** Output image format. Default "png". */
  format?: "png" | "jpeg";
  /**
   * Run the sharp downscale + compression pass. When false and the capture
   * size already equals the output size, the raw browser buffer is written.
   * Default true.
   */
  optimize?: boolean;
  /** Quality for jpeg output (1-100). Ignored for png. Default 90. */
  quality?: number;
}

export interface WaitOptions {
  /** CSS selector that must be present before the capture is taken. */
  selector?: string;
  /** Navigation timeout budget in ms. Default 30000. */
  timeout?: number;
  /** Extra settle delay after load, in ms. Default 500. */
  settleMs?: number;
  /** Selectors hidden before capture (consent banners, dev toolbars). */
  hideSelectors?: string[];
}

export interface RouteObject {
  /** Filename slug for the output, e.g. "about" -> about-de.png. */
  slug: string;
  /**
   * A single path applied to every locale (locale prefixing handled by
   * `localePrefix`). Use this OR `paths`, not both.
   */
  path?: string;
  /**
   * Explicit path per locale. `null` skips that locale entirely. Use when the
   * localized slugs differ (e.g. /about vs /nl/over-ons). Use this OR `path`.
   */
  paths?: Record<string, string | null>;
  /** Per-route resolution override, merged over the global default. */
  resolution?: Partial<Resolution>;
}

export type RouteInput = string | RouteObject;

export interface NextScanOptions {
  /** Path to the Next.js App Router directory, relative to cwd. Default "app". */
  appDir?: string;
  /** First-segment names to ignore (e.g. "api"). Default ["api"]. */
  ignore?: string[];
  /**
   * Dynamic segment names to strip rather than skip, e.g. ["locale"] for an
   * `app/[locale]/...` root. The `[name]` directory is removed from the path.
   */
  stripSegments?: string[];
  /** Include `[param]` routes (skipped by default — nothing to render). */
  includeDynamic?: boolean;
}

export type LocalePrefix =
  | "as-needed"
  | "always"
  | ((path: string, locale: string) => string);

export interface OgShotConfig {
  /** Base URL per environment, or a single URL string used for all. */
  baseUrl: string | Partial<Record<Environment, string>>;
  /** Environment used when none is passed on the CLI. Default "production". */
  defaultEnvironment?: Environment;
  /** Output directory for the images, relative to cwd. */
  outDir: string;
  /** Routes to capture. Combined with `autoScan` when both are set. */
  routes?: RouteInput[];
  /** Auto-scan a Next.js App Router for routes. Merged with `routes`. */
  autoScan?: boolean | NextScanOptions;
  /** Locales to fan out. Omit for a single, locale-less capture per route. */
  locales?: string[];
  /** Locale treated as default (unprefixed under "as-needed"). Default locales[0]. */
  defaultLocale?: string;
  /**
   * How a per-locale URL is built from a base path. "as-needed" leaves the
   * default locale unprefixed and prefixes the rest with `/{locale}`; "always"
   * prefixes every locale; a function gives full control. Default "as-needed".
   */
  localePrefix?: LocalePrefix;
  /** Global resolution default. Default { width: 1200, height: 630 }. */
  resolution?: Resolution;
  /** Output and optimization options. */
  output?: OutputOptions;
  /**
   * Filename template. Tokens: {slug}, {locale}. Default "{slug}-{locale}"
   * when locales are set, otherwise "{slug}".
   */
  filename?: string;
  /** Capture-time waiting and settling options. */
  wait?: WaitOptions;
}

/** One fully-resolved unit of work: a single image to capture and write. */
export interface Target {
  slug: string;
  locale: string | null;
  url: string;
  outPath: string;
  resolution: Required<Pick<Resolution, "width" | "height">> & {
    captureWidth: number;
    captureHeight: number;
    deviceScaleFactor: number;
  };
}

export interface RunOptions {
  environment?: Environment;
  /** Capture only routes whose slug or path contains one of these. */
  only?: string[];
  /** Capture only these locales. */
  locales?: string[];
  /** Resolve and print the matrix without launching a browser. */
  dryRun?: boolean;
  /** Override the base URL entirely (wins over config + environment). */
  baseUrlOverride?: string;
  /** Per-target progress callback. */
  onResult?: (result: TargetResult) => void;
}

export interface TargetResult {
  target: Target;
  status: "ok" | "failed";
  bytes?: number;
  error?: string;
}

export interface RunSummary {
  ok: number;
  failed: number;
  skipped: number;
  results: TargetResult[];
}
