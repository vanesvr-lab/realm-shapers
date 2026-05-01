#!/usr/bin/env tsx
// B-021 demo polish art. Generates two webp images via Flux 1.1 Pro:
//   - /themes/castle.webp (the new Castle and Dragons theme thumbnail)
//   - /backgrounds/castle/dragon_egg_quest.webp (the new Collect-the-Dragon's-
//     Egg starting place tile)
// Skips files that already exist; pass --force to regenerate.
//
// Run: npx tsx --env-file=.env.local scripts/generate-b021-art.ts

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImage } from "../lib/image-gen";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

type ImageJob = {
  id: string;
  outDir: string;
  filename: string;
  aspect: "16:9" | "1:1";
  prompt: string;
};

const STYLE = "painted Studio Ghibli watercolor style, warm atmospheric depth, no people, no text, no watermarks";

const JOBS: ImageJob[] = [
  {
    id: "castle_theme_thumbnail",
    outDir: "public/themes",
    filename: "castle.webp",
    aspect: "16:9",
    prompt: `A grand stone castle silhouetted at golden hour, dragons circling a far tower, ${STYLE}, square composition feel.`,
  },
  {
    id: "dragon_egg_quest",
    outDir: "public/backgrounds/castle",
    filename: "dragon_egg_quest.webp",
    aspect: "16:9",
    prompt: `A glowing dragon's egg resting in a stone nest deep inside a torch-lit cavern, a great sleeping dragon coiled around it, warm amber light, ${STYLE}.`,
  },
];

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN. Run with --env-file=.env.local.");
    process.exit(1);
  }

  console.log(`B-021 art: generating ${JOBS.length} images.\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const force = process.argv.includes("--force");

  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    const dir = path.join(ROOT, job.outDir);
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, job.filename);

    if (!force) {
      try {
        await fs.stat(out);
        console.log(`[${i + 1}/${JOBS.length}] ${job.id} skipped (exists)`);
        skipped++;
        continue;
      } catch {
        // not present, generate
      }
    }

    console.log(`[${i + 1}/${JOBS.length}] ${job.id} (${job.aspect}) ...`);
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

    if (i < JOBS.length - 1) await sleep(11_000);
  }

  console.log("\n--- summary ---");
  console.log(`Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
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
