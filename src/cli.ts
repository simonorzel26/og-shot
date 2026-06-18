#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { run } from "./run.js";
import { resolveTargets } from "./resolve.js";
import type { Environment, OgShotConfig, RunOptions } from "./types.js";

const CONFIG_NAMES = [
  "og.config.ts",
  "og.config.mts",
  "og.config.js",
  "og.config.mjs",
  "og.config.json",
];

const HELP = `og-shot: auto generate OG images for your Next.js App Router app

Usage:
  og-shot [options]

Options:
  -c, --config <path>   Path to the config file (default: og.config.*)
  -e, --env <name>      Environment: production | development | local
  -b, --base <url>      Override the base URL entirely
  -o, --only <list>     Comma-separated slugs/paths to include
  -l, --locale <list>   Comma-separated locales to include
      --dry-run         Print the resolved matrix without capturing
  -h, --help            Show this help

Config: export default defineConfig({ ... }) from og.config.ts.`;

interface Flags {
  config?: string;
  env?: Environment;
  base?: string;
  only?: string[];
  locale?: string[];
  dryRun: boolean;
  help: boolean;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "-c":
      case "--config":
        flags.config = next();
        break;
      case "-e":
      case "--env":
        flags.env = next() as Environment;
        break;
      case "-b":
      case "--base":
        flags.base = next();
        break;
      case "-o":
      case "--only":
        flags.only = splitList(next());
        break;
      case "-l":
      case "--locale":
        flags.locale = splitList(next());
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "-h":
      case "--help":
        flags.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return flags;
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function findConfigPath(explicit?: string): string {
  if (explicit) {
    const p = resolve(explicit);
    if (!existsSync(p)) throw new Error(`Config not found: ${p}`);
    return p;
  }
  for (const name of CONFIG_NAMES) {
    const p = resolve(name);
    if (existsSync(p)) return p;
  }
  throw new Error(
    `No config found. Create one of: ${CONFIG_NAMES.join(", ")} (or pass --config).`,
  );
}

async function loadConfig(path: string): Promise<OgShotConfig> {
  const mod = path.endsWith(".json")
    ? await import(pathToFileURL(path).href, { with: { type: "json" } })
    : await createJiti(import.meta.url).import(path);
  const config = (mod as { default?: OgShotConfig }).default ?? (mod as OgShotConfig);
  if (!config || typeof config !== "object" || !("outDir" in config)) {
    throw new Error(`Config at ${path} must default-export an OgShotConfig.`);
  }
  return config;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    process.stdout.write(HELP + "\n");
    return;
  }

  const config = await loadConfig(findConfigPath(flags.config));
  const options: RunOptions = {
    environment: flags.env,
    baseUrlOverride: flags.base,
    only: flags.only,
    locales: flags.locale,
    dryRun: flags.dryRun,
  };

  if (flags.dryRun) {
    const targets = resolveTargets(config, options);
    for (const t of targets) {
      const { width, height, captureWidth, captureHeight } = t.resolution;
      const size =
        captureWidth === width && captureHeight === height
          ? `${width}x${height}`
          : `${captureWidth}x${captureHeight} -> ${width}x${height}`;
      process.stdout.write(`  ${t.url}  ->  ${t.outPath}  (${size})\n`);
    }
    process.stdout.write(`\n${targets.length} target(s). Dry run, nothing captured.\n`);
    return;
  }

  const summary = await run(config, {
    ...options,
    onResult: (r) => {
      const tag = r.status === "ok" ? "ok  " : "FAIL";
      const detail = r.status === "ok" ? `${(r.bytes ?? 0) / 1000}kB` : r.error;
      process.stdout.write(`  ${tag}  ${r.target.outPath}  ${detail}\n`);
    },
  });

  process.stdout.write(`\n${summary.ok} ok · ${summary.failed} failed\n`);
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`og-shot: ${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
