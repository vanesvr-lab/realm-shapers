#!/usr/bin/env tsx
// Hunt the Dragon's Egg, video generator. Animates still scene .webp
// images into short MP4 entry videos via Replicate's image-to-video
// models. Mirrors the B-013 drawbridge pilot script's video logic, but
// iterates over multiple jobs from scripts/hunt-dragon-egg-videos.ts.
//
// Run: npx tsx --env-file=.env.local scripts/generate-hunt-dragon-egg-videos.ts
// Skips outputs that already exist (pass --force to regenerate). Each
// generation takes 30-180 seconds; the script throttles 8s between jobs.
// If the source .webp does not exist for a job, it is skipped with a
// warning so you can rerun after image generation completes.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateVideoFromImage,
  verifyModelExists,
  VIDEO_MODEL_CANDIDATES,
} from "../lib/image-gen";
import { HUNT_DRAGON_EGG_VIDEOS } from "./hunt-dragon-egg-videos";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error(
      "Missing REPLICATE_API_TOKEN. Add to .env.local and run with --env-file=.env.local."
    );
    process.exit(1);
  }

  console.log(
    `Hunt the Dragon's Egg videos: generating up to ${HUNT_DRAGON_EGG_VIDEOS.length} entry videos.\n`
  );

  // Pick the first reachable image-to-video model. Reuse for all jobs.
  console.log("Verifying image-to-video model reachability...");
  let pickedSlug: string | null = null;
  for (const slug of VIDEO_MODEL_CANDIDATES) {
    const ok = await verifyModelExists(slug);
    console.log(`  ${slug}: ${ok ? "reachable" : "unreachable"}`);
    if (ok && !pickedSlug) pickedSlug = slug;
  }
  if (!pickedSlug) {
    console.error("No image-to-video model reachable on Replicate.");
    process.exit(1);
  }
  console.log(`Using ${pickedSlug}\n`);

  let generated = 0;
  let skipped = 0;
  let missingSource = 0;
  let failed = 0;

  for (let i = 0; i < HUNT_DRAGON_EGG_VIDEOS.length; i++) {
    const job = HUNT_DRAGON_EGG_VIDEOS[i];
    const sourcePath = path.join(ROOT, job.source_image);
    const outPath = path.join(ROOT, job.output_path);
    const tag = `[${i + 1}/${HUNT_DRAGON_EGG_VIDEOS.length}] ${job.id}`;

    // Skip if output already exists (unless --force).
    if (!process.argv.includes("--force")) {
      try {
        await fs.stat(outPath);
        console.log(`${tag} skipped (output exists)`);
        skipped++;
        continue;
      } catch {
        // not present, proceed
      }
    }

    // Verify source image exists.
    let sourceBytes: Buffer;
    try {
      sourceBytes = await fs.readFile(sourcePath);
    } catch {
      console.warn(
        `${tag} skipped: source image missing at ${job.source_image}. Generate it with the still-image script first, then rerun.`
      );
      missingSource++;
      continue;
    }

    const dataUrl = `data:image/webp;base64,${sourceBytes.toString("base64")}`;
    const input = buildVideoInput(pickedSlug, dataUrl, job.prompt);

    console.log(`${tag} generating (may take 60-180s)...`);
    const t0 = Date.now();
    try {
      const { bytes, extension, bytesLength } = await runWithRetry(() =>
        generateVideoFromImage(pickedSlug!, input)
      );
      // Honor the planned output path filename, but keep the model's
      // returned extension if it differs (some models return webm).
      const finalOutPath = outPath.replace(/\.[^.]+$/, `.${extension}`);
      await fs.mkdir(path.dirname(finalOutPath), { recursive: true });
      await fs.writeFile(finalOutPath, bytes);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`    wrote ${finalOutPath} (${formatBytes(bytesLength)}, ${dt}s)`);
      generated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${tag} FAILED: ${msg}`);
      failed++;
    }

    // Throttle between jobs to avoid rate limits.
    if (i < HUNT_DRAGON_EGG_VIDEOS.length - 1) await sleep(8_000);
  }

  console.log("\n--- summary ---");
  console.log(
    `Generated: ${generated}, Skipped: ${skipped}, Missing source: ${missingSource}, Failed: ${failed}`
  );
  if (failed > 0) {
    console.log("Re-run to retry failed entries (skips successes by default).");
    process.exit(1);
  }
}

// Per-model parameter shape. Defaults favor a 5s, 16:9 clip suitable for
// looping behind a static scene image while a kid taps through narration.
function buildVideoInput(
  slug: string,
  imageDataUrl: string,
  prompt: string
): Record<string, unknown> {
  if (slug.startsWith("kwaivgi/kling")) {
    return {
      start_image: imageDataUrl,
      prompt,
      duration: 5,
      cfg_scale: 0.5,
      aspect_ratio: "16:9",
    };
  }
  if (slug.startsWith("lightricks/ltx-video")) {
    return {
      image: imageDataUrl,
      prompt,
      target_size: 768,
      num_frames: 121,
    };
  }
  if (slug.startsWith("stability-ai/stable-video")) {
    return {
      input_image: imageDataUrl,
      frames_per_second: 6,
      motion_bucket_id: 127,
      cond_aug: 0.02,
      decoding_t: 7,
      sizing_strategy: "maintain_aspect_ratio",
    };
  }
  return { image: imageDataUrl, prompt };
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
      const waitMs = 15_000 * attempt;
      console.log(
        `    rate-limited, retrying in ${(waitMs / 1000).toFixed(0)}s (attempt ${attempt}/4)...`
      );
      await sleep(waitMs);
    }
  }
  throw lastErr;
}
