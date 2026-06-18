# og-shot

CLI to auto generate OG images for your Next.js App Router app. It screenshots your real pages, so the social cards match what people actually see. No separate templates to keep in sync.

## Install

```bash
npm i -D og-shot playwright
npx playwright install chromium
```

## Use

Add `og.config.ts`:

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
  ],
});
```

Run it:

```bash
npx og-shot                    # production, every route and locale
npx og-shot --env development  # screenshot localhost
npx og-shot --only about       # one route
npx og-shot --dry-run          # print the plan, capture nothing
```

You get one PNG per route and locale in `public/og`.

## Routes

A route is a string or an object:

```ts
"/pricing"                                                  // slug taken from the path
{ slug: "about", path: "/about" }                           // prefixed per locale
{ slug: "about", paths: { de: "/about", nl: "/nl/over-ons", en: null } } // explicit, null skips
```

Use `paths` when the localized slugs differ. Set a locale to `null` to skip it, so an untranslated page never ships a wrong language card.

Read routes from the filesystem instead of listing them:

```ts
autoScan: { appDir: "app", stripSegments: ["locale"], ignore: ["api"] }
```

## How it works

It opens each route in headless Chromium at the capture size, waits for fonts, then downscales to the output size with sharp. Capturing wide and shrinking gives sharper text than rendering straight at 1200x630. Cookies are cleared between pages so a locale cookie cannot leak into the next URL.

## License

MIT
