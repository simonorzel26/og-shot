# og-shot

CLI to auto generate OG images for your Next.js App Router app. It screenshots your real pages, so the social cards match what people actually see. No separate templates to keep in sync.

## Install

```bash
npm install -D og-shot playwright
# pnpm add -D og-shot playwright
# yarn add -D og-shot playwright
# bun add -d og-shot playwright
```

Then grab the browser once:

```bash
npx playwright install chromium   # or: bunx playwright install chromium
```

## Use

Add an `og-shot` key to your `package.json`. No extra config file in the root:

```json
{
  "og-shot": {
    "baseUrl": { "production": "https://example.com", "development": "http://localhost:3000" },
    "outDir": "public/og",
    "locales": ["de", "en"],
    "resolution": { "width": 1200, "height": 630, "captureWidth": 1440, "captureHeight": 756 },
    "routes": ["/", { "slug": "about", "paths": { "de": "/about", "en": "/en/about" } }]
  }
}
```

Run it:

```bash
npx og-shot                    # production, every route and locale
npx og-shot --env development  # screenshot localhost
npx og-shot --only about       # one route
npx og-shot --dry-run          # print the plan, capture nothing
```

You get one PNG per route and locale in `public/og`.

Want autocomplete and a typed config (or a function for `localePrefix`)? Use `og.config.ts` instead of the package.json key:

```ts
import { defineConfig } from "og-shot";

export default defineConfig({
  baseUrl: { production: "https://example.com" },
  outDir: "public/og",
  routes: ["/"],
});
```

## Routes

A route is a string or an object:

```ts
"/pricing"                                                  // slug taken from the path
{ slug: "about", path: "/about" }                           // prefixed per locale
{ slug: "about", paths: { de: "/about", nl: "/nl/over-ons", en: null } } // explicit, null skips
```

Use `paths` when the localized slugs differ. Set a locale to `null` to skip it, so an untranslated page never ships a wrong language card.

Read routes from the Next build manifest instead of listing them (run `next build` first):

```ts
autoScan: { stripSegments: ["locale"], ignore: ["/api"] }
```

## Wiring og:image

Generating the PNGs does not change your meta tags. Set `manifest` and og-shot writes a map of the cards it produced:

```jsonc
// og.config: "manifest": "lib/og-cards.json"
{
  "about": { "de": "/og/about-de.png", "en": "/og/about-en.png" },
  "pricing": { "de": "/og/pricing-de.png" }   // a skipped locale is just absent
}
```

Read it in your metadata. In Next.js:

```ts
import cards from "@/lib/og-cards.json";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const image = cards["about"]?.[locale];
  return { openGraph: { images: image ? [image] : undefined } };
}
```

A locale that was skipped (set to `null`) is missing from the map, so `image` is undefined and you fall back to your default card.

## How it works

It opens each route in headless Chromium at the capture size, waits for fonts, then downscales to the output size with sharp. Capturing wide and shrinking gives sharper text than rendering straight at 1200x630. Cookies are cleared between pages so a locale cookie cannot leak into the next URL.

## License

MIT
