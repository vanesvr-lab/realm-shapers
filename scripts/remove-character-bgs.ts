#!/usr/bin/env tsx
// Strips backgrounds from character images using Replicate's
// 851-labs/background-remover model and dual-writes transparent PNGs to:
//   /public/assets/characters/<library_id>.png  (HeroAvatar render in /play)
//   /public/characters/<picker_id>.png          (landing-page character picker)
// Most characters use the same id at both paths; the one alias is the
// picker's "merkid" which is the asset library's "mermaid".
//
// Run:
//   npx tsx --env-file=.env.local scripts/remove-character-bgs.ts
//
// Default targets are the 7 picker characters that still need real art
// after the wizard one-off. Wizard is excluded by default (already shipped)
// but you can pass it explicitly to redo it idempotently.
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

// Picker character id -> asset library id. Identical for everyone except
// "merkid" (picker label "Mer-Kid") which maps to the asset library's
// "mermaid" entry. Keep this list aligned with lib/characters-catalog.ts.
const PICKER_TO_LIBRARY: Record<string, string> = {
  knight: "knight",
  princess: "princess",
  astronaut: "astronaut",
  merkid: "mermaid",
  gingerbread_kid: "gingerbread_kid",
  robot: "robot",
  dragon: "dragon",
};

// Default set: the 7 picker characters that still need bg removal after
// the wizard one-off. Pass ids on the CLI to override.
const DEFAULT_PICKER_IDS = [
  "knight",
  "princess",
  "astronaut",
  "merkid",
  "gingerbread_kid",
  "robot",
  "dragon",
];

const MODEL =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

const ASSET_DIR = "public/assets/characters";
const PICKER_DIR = "public/characters";
// Extensions to look for on the source side, in order of preference.
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
  const pickerIds = args.length > 0 ? args : DEFAULT_PICKER_IDS;

  console.log(
    `Stripping backgrounds for ${pickerIds.length} character${pickerIds.length === 1 ? "" : "s"}: ${pickerIds.join(", ")}\n`
  );

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < pickerIds.length; i++) {
    const pickerId = pickerIds[i];
    const libraryId = PICKER_TO_LIBRARY[pickerId] ?? pickerId;
    const tag = `[${i + 1}/${pickerIds.length}] ${pickerId}${libraryId === pickerId ? "" : ` (library: ${libraryId})`}`;
    const sourcePath = await findSource(path.join(ROOT, ASSET_DIR), libraryId);
    if (!sourcePath) {
      console.warn(
        `${tag} skipped: no source file at ${ASSET_DIR}/${libraryId}.{${SOURCE_EXTS.join(",")}}`
      );
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

    // Dual-write: asset library (used by HeroAvatar) and picker mirror
    // (used by the landing page character grid).
    const assetPng = path.join(ROOT, ASSET_DIR, `${libraryId}.png`);
    const pickerPng = path.join(ROOT, PICKER_DIR, `${pickerId}.png`);
    await fs.mkdir(path.dirname(pickerPng), { recursive: true });
    await fs.writeFile(assetPng, bytes);
    await fs.writeFile(pickerPng, bytes);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `  wrote ${path.relative(ROOT, assetPng)} + ${path.relative(ROOT, pickerPng)} (${formatBytes(bytes.length)}, ${dt}s)`
    );

    // If the asset-library source had a different extension, drop it so the
    // library cleanly switches to .png.
    if (sourcePath !== assetPng) {
      try {
        await fs.unlink(sourcePath);
        console.log(`  removed ${path.relative(ROOT, sourcePath)}`);
      } catch {
        // best effort
      }
    }
    processed++;

    // Throttle between API calls.
    if (i < pickerIds.length - 1) await sleep(2_000);
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
