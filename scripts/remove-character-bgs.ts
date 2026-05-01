#!/usr/bin/env tsx
// Strips backgrounds from character images using Replicate's
// 851-labs/background-remover model and writes transparent PNGs back to
// the asset library at /public/assets/characters/. Run:
//
//   npx tsx --env-file=.env.local scripts/remove-character-bgs.ts
//
// Default targets are the 8 catalog characters the kid can pick at step 3
// of the landing form. Override by passing ids:
//
//   npx tsx --env-file=.env.local scripts/remove-character-bgs.ts knight princess
//
// Each character costs roughly $0.005 in Replicate credits. The script
// throttles 2 seconds between API calls. After it finishes, run:
//
//   npx tsx scripts/sync-asset-files.ts
//
// to update lib/asset-files.generated.ts in case any extensions changed.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// The 8 characters the kid picks at landing step 3 (lib/characters-catalog.ts).
// Wizard is included so this script can be re-run idempotently across the
// full set if you want to redo all of them with one command.
const DEFAULT_IDS = [
  "knight",
  "wizard",
  "princess",
  "astronaut",
  "merkid",
  "gingerbread_kid",
  "robot",
  "dragon",
];

const MODEL =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

// Where character assets live. The hero render for the play scene resolves
// from the asset library at /public/assets/characters/<id>.<ext>. The
// /public/characters/ mirror is only used for theme-catalog thumbnails
// (mostly SVG placeholders); we leave those alone.
const ASSET_DIR = "public/assets/characters";
// Extensions to look for, in order of preference for source.
const SOURCE_EXTS = ["webp", "png", "jpg", "jpeg"];

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error(
      "Missing REPLICATE_API_TOKEN. Run with --env-file=.env.local."
    );
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const ids = args.length > 0 ? args : DEFAULT_IDS;

  console.log(
    `Stripping backgrounds for ${ids.length} character${ids.length === 1 ? "" : "s"}: ${ids.join(", ")}\n`
  );

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const tag = `[${i + 1}/${ids.length}] ${id}`;
    const sourcePath = await findSource(path.join(ROOT, ASSET_DIR), id);
    if (!sourcePath) {
      console.warn(`${tag} skipped: no source file at ${ASSET_DIR}/${id}.{${SOURCE_EXTS.join(",")}}`);
      skipped++;
      continue;
    }

    let sourceBytes: Buffer;
    try {
      sourceBytes = await fs.readFile(sourcePath);
    } catch (err) {
      console.error(`${tag} read failed: ${String(err)}`);
      failed++;
      continue;
    }

    const ext = path.extname(sourcePath).slice(1).toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
    const dataUrl = `data:image/${mime};base64,${sourceBytes.toString("base64")}`;

    console.log(`${tag} removing background...`);
    const t0 = Date.now();
    let bytes: Buffer;
    try {
      const output = await replicate.run(MODEL, { input: { image: dataUrl } });
      const url = Array.isArray(output) ? String(output[0]) : String(output);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
      }
      bytes = Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.error(`${tag} FAILED: ${String(err)}`);
      failed++;
      // Throttle anyway to avoid hammering on errors.
      await sleep(2_000);
      continue;
    }

    // Save as PNG with alpha. If the original was a different extension,
    // remove it so the asset library cleanly switches to .png.
    const pngPath = path.join(path.dirname(sourcePath), `${id}.png`);
    await fs.writeFile(pngPath, bytes);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  wrote ${path.relative(ROOT, pngPath)} (${formatBytes(bytes.length)}, ${dt}s)`);
    if (sourcePath !== pngPath) {
      try {
        await fs.unlink(sourcePath);
        console.log(`  removed ${path.relative(ROOT, sourcePath)}`);
      } catch {
        // best effort
      }
    }
    processed++;

    // Throttle between API calls.
    if (i < ids.length - 1) await sleep(2_000);
  }

  console.log("\n--- summary ---");
  console.log(
    `Processed: ${processed}, Skipped: ${skipped}, Failed: ${failed}`
  );
  console.log(
    "\nNow run: npx tsx scripts/sync-asset-files.ts  to refresh the manifest."
  );
  if (failed > 0) process.exit(1);
}

async function findSource(dir: string, id: string): Promise<string | null> {
  for (const ext of SOURCE_EXTS) {
    const candidate = path.join(dir, `${id}.${ext}`);
    try {
      await fs.stat(candidate);
      return candidate;
    } catch {
      // not present, try next extension
    }
  }
  return null;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
