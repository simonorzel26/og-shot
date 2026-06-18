import { chromium, type Browser, type BrowserContext } from "playwright";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Target, WaitOptions } from "./types.js";

function isMissingBrowserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Executable doesn't exist") ||
    message.includes("playwright install")
  );
}

/** Download Chromium once on first run, so install is a single npm command. */
function installChromium(): void {
  const require = createRequire(import.meta.url);
  const pkgJsonPath = require.resolve("playwright/package.json");
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const binRel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.playwright;
  if (!binRel) {
    throw new Error("og-shot: could not locate the Playwright CLI to install Chromium.");
  }
  const cliPath = join(dirname(pkgJsonPath), binRel);
  process.stderr.write(
    "og-shot: Chromium not found, downloading it once (this can take a minute)...\n",
  );
  execFileSync(process.execPath, [cliPath, "install", "chromium"], { stdio: "inherit" });
}

async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!isMissingBrowserError(error)) throw error;
    installChromium();
    return chromium.launch();
  }
}

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DISABLE_ANIMATIONS =
  "*,*::before,*::after{animation:none !important;transition:none !important;" +
  "animation-duration:0s !important;scroll-behavior:auto !important}";

export interface Capturer {
  shoot(target: Target): Promise<Buffer>;
  close(): Promise<void>;
}

/**
 * A reusable headless-Chromium capturer. Cookies are cleared before every
 * navigation so a previous locale-prefixed visit cannot leak its locale cookie
 * into the next unprefixed URL. A non-2xx response throws rather than writing a
 * screenshot of an error page.
 *
 * `deviceScaleFactor` is a context-level setting in Playwright, so it is fixed
 * here for the whole run rather than per route. The viewport (captureWidth ×
 * captureHeight) still varies per target.
 */
export async function createCapturer(
  wait: WaitOptions = {},
  deviceScaleFactor = 1,
): Promise<Capturer> {
  const timeout = wait.timeout ?? 30000;
  const settleMs = wait.settleMs ?? 500;

  const browser: Browser = await launchChromium();
  const context: BrowserContext = await browser.newContext({
    reducedMotion: "reduce",
    userAgent: DEFAULT_UA,
    deviceScaleFactor,
  });

  return {
    async shoot(target) {
      const { captureWidth, captureHeight } = target.resolution;
      await context.clearCookies();
      const page = await context.newPage();
      try {
        await page.setViewportSize({ width: captureWidth, height: captureHeight });
        const response = await page.goto(target.url, { waitUntil: "networkidle", timeout });
        const status = response?.status() ?? 0;
        if (status < 200 || status >= 300) {
          throw new Error(`HTTP ${status} for ${target.url}`);
        }

        await page.addStyleTag({ content: DISABLE_ANIMATIONS });
        await page.evaluate(() => document.fonts.ready);
        if (wait.selector) {
          await page.waitForSelector(wait.selector, { timeout });
        }
        for (const selector of wait.hideSelectors ?? []) {
          await page
            .locator(selector)
            .evaluateAll((nodes) =>
              nodes.forEach((n) => ((n as HTMLElement).style.display = "none")),
            )
            .catch(() => undefined);
        }
        if (settleMs > 0) await page.waitForTimeout(settleMs);

        // Clip is in CSS pixels; Playwright renders it at deviceScaleFactor,
        // so the returned buffer is captureWidth*dsf × captureHeight*dsf.
        return await page.screenshot({
          clip: { x: 0, y: 0, width: captureWidth, height: captureHeight },
        });
      } finally {
        await page.close();
      }
    },
    async close() {
      await browser.close();
    },
  };
}
