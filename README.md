# og-shot

Screenshot your routes into Open Graph images. Define the routes you want cards for, run the CLI, get optimized per-locale PNGs of your **real pages**.

```bash
npm i -D og-shot playwright
npx playwright install chromium
```

## Why not `next/og`?

`next/og` (and `@vercel/og` / Satori) render a **separate template you hand-write** in a small HTML/CSS subset, with no browser. Quoting the `@vercel/og` description: *"Generate Open Graph Images dynamically from HTML/CSS without a browser."* That means your page's real layout, Tailwind `grid`, custom fonts, and components never appear on the card unless you rebuild them by hand and keep them in sync.

`og-shot` takes the other path: it drives headless Chromium, navigates to each route, and screenshots the **actual rendered page**, then downscales to the OG canvas. No parallel template to maintain. Reach for `next/og` instead if you do *not* need the real page pixels.

## Quick start

Create `og.config.ts`:

```ts
import { defineConfig } from "og-shot";

export default defineConfig({
  baseUrl: {
    production: "https://example.com",
    development: "http://localhost:3000",
  },
  outDir: "public/og",
  locales: ["de", "en"],
  resolution: { width: 1200, height: 630, captureWidth: 1440, captureHeight: 756 },
  routes: [
    "/",
    { slug: "about", paths: { de: "/about", en: "/en/about" } },
    { slug: "pricing", path: "/pricing", resolution: { captureHeight: 900 } },
  ],
});
```

Run it:

```bash
npx og-shot                    # production base URL, full matrix
npx og-shot --env development  # screenshot localhost instead
npx og-shot --only about       # just one route
npx og-shot --locale en        # just one locale
npx og-shot --dry-run          # print the (url -> file, size) matrix, capture nothing
```

Output: `public/og/home-de.png`, `public/og/about-en.png`, ... one optimized PNG per route × locale.

## How it captures

The page is loaded at `captureWidth × captureHeight` (so your wide breakpoints apply), animations are disabled, fonts are awaited, then it is screenshot and **Lanczos3-downscaled** to `width × height` with a strong PNG compression pass. Capturing wide and shrinking gives sharper text than rendering straight at `1200×630`. Cookies are cleared before every navigation so a previous `/en/...` visit can't leak its locale cookie into the next unprefixed URL. A non-2xx response fails that target instead of writing a screenshot of an error page.

## Config reference

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `baseUrl` | `string \| { production?, development?, local? }` | — | Per-environment base URLs, or one string. |
| `defaultEnvironment` | `"production" \| "development" \| "local"` | `"production"` | Used when `--env` is omitted. |
| `outDir` | `string` | — | Where PNGs are written (relative to cwd). |
| `routes` | `(string \| RouteObject)[]` | — | See below. Combined with `autoScan`. |
| `autoScan` | `boolean \| NextScanOptions` | `false` | Scan a Next.js App Router for routes. |
| `locales` | `string[]` | — | Omit for a single, locale-less capture per route. |
| `defaultLocale` | `string` | `locales[0]` | Unprefixed under `localePrefix: "as-needed"`. |
| `localePrefix` | `"as-needed" \| "always" \| (path, locale) => string` | `"as-needed"` | How per-locale URLs are built from `path`. |
| `resolution` | `{ width, height, captureWidth?, captureHeight?, deviceScaleFactor? }` | `1200×630` | `deviceScaleFactor` is a whole-run setting. |
| `output` | `{ format?: "png" \| "jpeg", optimize?, quality? }` | `png`, optimized | |
| `filename` | `string` | `"{slug}-{locale}"` | Tokens `{slug}`, `{locale}`. |
| `wait` | `{ selector?, timeout?, settleMs?, hideSelectors? }` | `timeout 30s`, `settle 500ms` | |

### Routes

A route is a string (`"/pricing"` → slug `pricing`, locale-prefixed) or an object:

```ts
{ slug: "about", path: "/about" }                                  // prefix per locale
{ slug: "about", paths: { de: "/about", en: "/en/about", nl: null } } // explicit; null skips
{ slug: "hero", path: "/", resolution: { captureHeight: 900 } }    // per-route size
```

Use `paths` when localized slugs differ (`/about` vs `/nl/over-ons`); `null` skips a locale (e.g. an untranslated page) instead of shipping a wrong-language card.

### Auto-scanning Next.js routes

```ts
autoScan: { appDir: "app", stripSegments: ["locale"], ignore: ["api"] }
```

Walks `app/` for `page.*` files. Route groups `(group)` and parallel slots `@slot` are stripped; `[param]` routes are skipped (nothing concrete to screenshot) unless `includeDynamic`. `stripSegments: ["locale"]` removes an `app/[locale]/...` wrapper. Explicit `routes` win over scanned ones with the same slug.

Note: auto-scan reads the **filesystem** path, so it does not know about localized URL rewrites (e.g. next-intl `pathnames`). For apps with localized slugs, define routes explicitly with `paths`.

## Programmatic API

```ts
import { run, resolveTargets } from "og-shot";
import config from "./og.config.js";

const summary = await run(config, { environment: "production" });
console.log(summary.ok, summary.failed);
```

## Requirements

`playwright` is a peer dependency (so it shares your project's version and browser cache). Run `npx playwright install chromium` once.

## License

MIT © Simon Orzel
