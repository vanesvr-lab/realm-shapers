#!/usr/bin/env tsx
// Hunt the Dragon's Egg, automated art generator. Run:
//   npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-art.ts
// Generates 26 webp images via Flux 1.1 Pro (21 scene backgrounds + 5 pickup
// icons) using the prompts in scripts/hunt-dragon-egg-prompts.ts. Skips files
// that already exist; pass --force to regenerate. Throttles to 11s per call
// to stay under Replicate's 6 req/min cap on low-credit accounts.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImage } from "../lib/image-gen";
import { HUNT_DRAGON_EGG_JOBS } from "./hunt-dragon-egg-prompts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN. Add to .env.local and run with --env-file=.env.local.");
    process.exit(1);
  }

  console.log(`Hunt the Dragon's Egg art: generating ${HUNT_DRAGON_EGG_JOBS.length} images.\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < HUNT_DRAGON_EGG_JOBS.length; i++) {
    const job = HUNT_DRAGON_EGG_JOBS[i];
    const dir = path.join(ROOT, job.outDir);
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, job.filename);

    if (!process.argv.includes("--force")) {
      try {
        await fs.stat(out);
        console.log(`[${i + 1}/${HUNT_DRAGON_EGG_JOBS.length}] ${job.id} skipped (exists)`);
        skipped++;
        continue;
      } catch {
        // not present, generate
      }
    }

    console.log(`[${i + 1}/${HUNT_DRAGON_EGG_JOBS.length}] ${job.id} (${job.aspect}) ...`);
    const t0 = Date.now();
    try {
      const { bytes, bytesLength } = await runWithRetry(() =>
        generateImage({
          prompt: job.prompt,
          aspect_ratio: job.aspect,
          output_format: "webp",
        })
      );
      await fs.writeFile(out, bytes);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`    wrote ${out} (${formatBytes(bytesLength)}, ${dt}s)`);
      generated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    FAILED: ${msg}`);
      failed++;
    }

    if (i < HUNT_DRAGON_EGG_JOBS.length - 1) await sleep(11_000);
  }

  console.log("\n--- summary ---");
  console.log(`Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Re-run to retry failed entries (skips successes by default).");
    process.exit(1);
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = /429|Too Many Requests|rate limit/i.test(msg);
      if (!is429) throw err;
      const waitMs = 12_000 * attempt;
      console.log(`    rate-limited, retrying in ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt}/4)...`);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

