import { defineConfig } from "og-shot";

export default defineConfig({
  baseUrl: {
    production: "https://example.com",
    development: "http://localhost:3000",
  },
  defaultEnvironment: "production",
  outDir: "public/og",

  locales: ["de", "en", "nl"],
  defaultLocale: "de",
  localePrefix: "as-needed", // de unprefixed, /en and /nl prefixed

  // Capture at 1440x756 so the xl: breakpoint applies, then Lanczos-downscale
  // to the 1200x630 OG canvas for crisp text. 1440/756 = 1200/630 = 1.905.
  resolution: { width: 1200, height: 630, captureWidth: 1440, captureHeight: 756 },
  output: { format: "png", optimize: true },

  // Hide a cookie banner before the shot, wait for the hero, settle a beat.
  wait: { hideSelectors: ["#cookie-banner"], settleMs: 500 },

  routes: [
    // Simple: one path, locale-prefixed automatically -> home-de/-en/-nl.png
    "/",

    // Explicit per-locale paths (localized slugs differ); null skips a locale.
    {
      slug: "about",
      paths: { de: "/about", en: "/en/about", nl: "/nl/over-ons" },
    },

    // Per-route resolution override.
    {
      slug: "pricing",
      path: "/pricing",
      resolution: { captureHeight: 900 },
    },

    // A wiki article that has no Dutch translation yet: skip nl.
    {
      slug: "deep-dive",
      paths: { de: "/wiki/deep-dive", en: "/en/wiki/deep-dive", nl: null },
    },
  ],

  // Or skip the explicit list and scan the App Router (strip the [locale] root):
  // autoScan: { appDir: "app", stripSegments: ["locale"], ignore: ["api"] },
});
