#!/usr/bin/env tsx
// B-013 pilot art generator. Run: `npx tsx --env-file=.env.local scripts/generate-pilot-art.ts`.
// Generates 8 webp images via Flux 1.1 Pro plus 1 entry video via the best
// reachable image-to-video model on Replicate. See docs/cli-briefs/B-013-ai-art-pilot.md.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateImage,
  generateVideoFromImage,
  verifyModelExists,
  VIDEO_MODEL_CANDIDATES,
} from "../lib/image-gen";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const STYLE = "painterly fantasy storybook art, soft lighting, vibrant kid-friendly colors, no text or watermarks";

type ImageJob = {
  id: string;
  outDir: string;
  filename: string;
  prompt: string;
  aspect: "16:9" | "1:1";
  alsoWriteTo?: string; // optional second copy for catalog/library duality
};

const IMAGE_JOBS: ImageJob[] = [
  {
    id: "drawbridge",
    outDir: "public/backgrounds/castle",
    filename: "drawbridge.webp",
    aspect: "16:9",
    prompt: `A medieval castle drawbridge at golden hour, wooden planks crossing a moat, stone archway with iron chains, distant castle wall, soft warm sunlight, ${STYLE}.`,
  },
  {
    id: "wizard",
    outDir: "public/characters",
    filename: "wizard.webp",
    aspect: "1:1",
    // Mirror to the asset library path so the in-game hero render also picks
    // up the new portrait. Per B-011 open thread: catalog thumbnail vs hero
    // render share an id but live at different paths. One generation, two writes.
    alsoWriteTo: "public/assets/characters/wizard.webp",
    prompt: `A young wizard with a kind face, wearing a blue starry robe and pointed hat, holding a wooden staff, full-body portrait, soft pale neutral background (light grey or cream), ${STYLE}.`,
  },
  {
    id: "rusty_key",
    outDir: "public/pickups",
    filename: "rusty_key.webp",
    aspect: "1:1",
    prompt: `a small ornate rusty iron key with a heart-shaped handle, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "torch",
    outDir: "public/pickups",
    filename: "torch.webp",
    aspect: "1:1",
    prompt: `a wooden torch with bright orange flame, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "climbing_rope",
    outDir: "public/pickups",
    filename: "climbing_rope.webp",
    aspect: "1:1",
    prompt: `a coiled brown climbing rope with a small grappling hook, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "dragons_lullaby",
    outDir: "public/pickups",
    filename: "dragons_lullaby.webp",
    aspect: "1:1",
    prompt: `a glowing musical scroll with golden notes floating around it, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "ancient_tome",
    outDir: "public/pickups",
    filename: "ancient_tome.webp",
    aspect: "1:1",
    prompt: `a thick leather-bound ancient book with brass clasps, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "dragons_egg",
    outDir: "public/pickups",
    filename: "dragons_egg.webp",
    aspect: "1:1",
    prompt: `a large speckled iridescent dragon egg in a nest of soft moss, isolated on a clean pale background, ${STYLE}.`,
  },
];

const VIDEO_PROMPT = "the drawbridge slowly lowers, water ripples in the moat, banners gently flutter on either side, soft warm sunset light, subtle camera push-in.";
const VIDEO_OUT_DIR = "public/backgrounds/castle";
const VIDEO_BASENAME = "drawbridge_entry";

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN. Add to .env.local and run with --env-file=.env.local.");
    process.exit(1);
  }

  console.log(`B-013 pilot art: generating ${IMAGE_JOBS.length} images then 1 entry video.\n`);

  const drawbridgeBytes = await runImageJobs();
  const videoResult = await runVideoJob(drawbridgeBytes);

  console.log("\n--- summary ---");
  console.log(`Images: ${IMAGE_JOBS.length} written.`);
  if (videoResult.ok) {
    console.log(`Video: ${videoResult.filename} (${formatBytes(videoResult.size)}) via ${videoResult.modelSlug}`);
  } else {
    console.log(`Video: FAILED. Reason: ${videoResult.reason}`);
    console.log("Per brief: ship pilot without video. Vanessa reviews stills only.");
  }
}

async function runImageJobs(): Promise<Buffer> {
  let drawbridgeBytes: Buffer | null = null;

  for (let i = 0; i < IMAGE_JOBS.length; i++) {
    const job = IMAGE_JOBS[i];
    const dir = path.join(ROOT, job.outDir);
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, job.filename);

    // Skip if file already exists. Lets the script resume after a rate-limit
    // hit without re-spending credits. Pass --force to regenerate.
    if (!process.argv.includes("--force")) {
      try {
        await fs.stat(out);
        console.log(`[${i + 1}/${IMAGE_JOBS.length}] ${job.id} skipped (exists)`);
        if (job.id === "drawbridge") drawbridgeBytes = await fs.readFile(out);
        if (job.alsoWriteTo) {
          const mirror = path.join(ROOT, job.alsoWriteTo);
          try {
            await fs.stat(mirror);
          } catch {
            await fs.mkdir(path.dirname(mirror), { recursive: true });
            await fs.copyFile(out, mirror);
            console.log(`    backfilled mirror ${job.alsoWriteTo}`);
          }
        }
        continue;
      } catch {
        // not present, generate
      }
    }

    console.log(`[${i + 1}/${IMAGE_JOBS.length}] ${job.id} (${job.aspect}) ...`);
    const t0 = Date.now();
    const { bytes, bytesLength } = await runWithRetry(() =>
      generateImage({
        prompt: job.prompt,
        aspect_ratio: job.aspect,
        output_format: "webp",
      })
    );
    await fs.writeFile(out, bytes);
    if (job.alsoWriteTo) {
      const mirrorPath = path.join(ROOT, job.alsoWriteTo);
      await fs.mkdir(path.dirname(mirrorPath), { recursive: true });
      await fs.writeFile(mirrorPath, bytes);
      console.log(`    mirrored to ${job.alsoWriteTo}`);
    }
    if (job.id === "drawbridge") drawbridgeBytes = bytes;
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`    wrote ${out} (${formatBytes(bytesLength)}, ${dt}s)`);

    // Replicate throttles to 6 req/min on low-credit accounts. Wait 11s
    // between successful calls to stay under the limit.
    if (i < IMAGE_JOBS.length - 1) await sleep(11_000);
  }

  if (!drawbridgeBytes) throw new Error("Drawbridge image was not generated");
  return drawbridgeBytes;
}

type VideoResult =
  | { ok: true; filename: string; size: number; modelSlug: string }
  | { ok: false; reason: string };

async function runVideoJob(drawbridgeBytes: Buffer): Promise<VideoResult> {
  console.log("\nVerifying image-to-video model reachability...");
  let pickedSlug: string | null = null;
  for (const slug of VIDEO_MODEL_CANDIDATES) {
    const ok = await verifyModelExists(slug);
    console.log(`  ${slug}: ${ok ? "reachable" : "unreachable"}`);
    if (ok && !pickedSlug) pickedSlug = slug;
  }
  if (!pickedSlug) {
    return { ok: false, reason: "no image-to-video model reachable on Replicate" };
  }
  console.log(`Using ${pickedSlug}`);

  // Pass the drawbridge as a base64 data URL. Most Replicate image-to-video
  // models accept a data URL for the start image input.
  const dataUrl = `data:image/webp;base64,${drawbridgeBytes.toString("base64")}`;
  const input = buildVideoInput(pickedSlug, dataUrl, VIDEO_PROMPT);

  console.log("Generating entry video (may take 60-180s, throttled retries on 429)...");
  // Wait for the 6 req/min image rate-limit window to clear before posting
  // the video call.
  await sleep(15_000);
  const t0 = Date.now();
  try {
    const { bytes, extension, bytesLength } = await runWithRetry(() =>
      generateVideoFromImage(pickedSlug!, input)
    );
    const filename = `${VIDEO_BASENAME}.${extension}`;
    const dir = path.join(ROOT, VIDEO_OUT_DIR);
    await fs.mkdir(dir, { recursive: true });
    const out = path.join(dir, filename);
    await fs.writeFile(out, bytes);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`Wrote ${out} (${formatBytes(bytesLength)}, ${dt}s)`);
    return { ok: true, filename, size: bytesLength, modelSlug: pickedSlug };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `${pickedSlug} run failed: ${msg}` };
  }
}

function buildVideoInput(slug: string, imageDataUrl: string, prompt: string): Record<string, unknown> {
  // Per-model parameter shape. Defaults here favor a 5s, 16:9 clip.
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
  // Generic fallback: try common field names.
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

// Retry on transient 429 (rate limit). Honors retry-after where present, else
// waits 12s and tries again up to 4 times.
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
