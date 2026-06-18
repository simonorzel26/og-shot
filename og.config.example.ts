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
  localePrefix: "as-needed", // de plain, /en and /nl prefixed

  // Capture at 1440x756, then downscale to the 1200x630 canvas for sharp text.
  resolution: { width: 1200, height: 630, captureWidth: 1440, captureHeight: 756 },
  output: { format: "png", optimize: true },

  // Hide a cookie banner, wait a beat before the shot.
  wait: { hideSelectors: ["#cookie-banner"], settleMs: 500 },

  routes: [
    // One path, prefixed per locale. Gives home-de, home-en, home-nl.
    "/",

    // Explicit paths when the localized slugs differ. null skips a locale.
    { slug: "about", paths: { de: "/about", en: "/en/about", nl: "/nl/over-ons" } },

    // Resolution override for one route.
    { slug: "pricing", path: "/pricing", resolution: { captureHeight: 900 } },

    // No Dutch page yet, so skip nl.
    { slug: "deep-dive", paths: { de: "/wiki/deep-dive", en: "/en/wiki/deep-dive", nl: null } },
  ],

  // Or read routes from the Next build manifest instead of listing them
  // (needs `next build` first):
  // autoScan: { stripSegments: ["locale"], ignore: ["/api"] },
});
