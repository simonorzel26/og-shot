import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveTargets } from "./resolve.js";
import { createCapturer } from "./capture.js";
import { optimize } from "./optimize.js";
import { writeManifest } from "./manifest.js";
import type { OgShotConfig, RunOptions, RunSummary, TargetResult } from "./types.js";

/**
 * Resolve the config into a target matrix, then capture, optimize and write
 * each image. Targets that error are recorded and skipped; the run continues.
 */
export async function run(
  config: OgShotConfig,
  options: RunOptions = {},
): Promise<RunSummary> {
  const targets = resolveTargets(config, options);

  if (options.dryRun) {
    return { ok: 0, failed: 0, skipped: targets.length, results: [] };
  }

  const deviceScaleFactor = config.resolution?.deviceScaleFactor ?? 1;
  const capturer = await createCapturer(config.wait, deviceScaleFactor);
  const results: TargetResult[] = [];

  try {
    for (const target of targets) {
      let result: TargetResult;
      try {
        const captured = await capturer.shoot(target);
        const out = await optimize(captured, target, config.output);
        await mkdir(dirname(target.outPath), { recursive: true });
        await writeFile(target.outPath, out);
        result = { target, status: "ok", bytes: out.length };
      } catch (error) {
        result = {
          target,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        };
      }
      results.push(result);
      options.onResult?.(result);
    }
  } finally {
    await capturer.close();
  }

  await writeManifest(results, config);

  return {
    ok: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: 0,
    results,
  };
}
