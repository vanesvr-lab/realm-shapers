#!/usr/bin/env tsx
// Remove white backgrounds from character + prop PNGs via Replicate.
// Usage: npx tsx scripts/remove-asset-backgrounds.ts [--only id1,id2] [--category characters|props] [--force]
// Skips backgrounds (those should stay opaque). Writes back to the same path.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";
import { ASSET_LIBRARY, type AssetDef } from "../lib/asset-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 851-labs/background-remover is a well-maintained, fast bg-removal model on Replicate.
const MODEL =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc" as const;

const RATE_LIMIT_DELAY_MS = 11000; // same throttle as the gen script

const args = parseArgs(process.argv.slice(2));

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("Missing REPLICATE_API_TOKEN");
  process.exit(1);
}

const client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  // Skip backgrounds; only process characters + props.
  const target: AssetDef[] = ASSET_LIBRARY.filter((a) => {
    if (a.category === "backgrounds") return false;
    if (args.only && !args.only.includes(a.id)) return false;
    if (args.category && a.category !== args.category) return false;
    return true;
  });

  console.log(`Removing background from ${target.length} assets...`);

  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (const asset of target) {
    const filePath = path.join(ROOT, "public/assets", asset.category, asset.filename);

    // Skip if already transparent (has alpha channel and at least one transparent pixel).
    if (!args.force) {
      const isTransparent = await hasTransparency(filePath).catch(() => false);
      if (isTransparent) {
        skipped++;
        console.log(`[skip] ${asset.id} (already transparent)`);
        continue;
      }
    }

    try {
      const buf = await removeBackground(filePath);
      await fs.writeFile(filePath, buf);
      done++;
      console.log(`[ok ${done}/${target.length}] ${asset.category}/${asset.id}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[fail] ${asset.id}: ${msg}`);
    }

    // Throttle to stay under rate limits
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  console.log(`\nDone. ${done} succeeded, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(2);
}

async function removeBackground(filePath: string): Promise<Buffer> {
  // Replicate accepts a data URL or a public URL. Read file and base64-encode.
  const fileData = await fs.readFile(filePath);
  const dataUrl = `data:image/png;base64,${fileData.toString("base64")}`;

  const output = (await client.run(MODEL, {
    input: { image: dataUrl },
  })) as unknown;

  // Output is typically a URL string or a stream. Normalize to URL.
  const url = typeof output === "string" ? output : (output as { url?: () => string })?.url?.() ?? String(output);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch result: ${res.status}`);
  }
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function hasTransparency(filePath: string): Promise<boolean> {
  // Cheap check: look at the PNG IHDR for color type 4 (grayscale+alpha) or 6 (RGBA).
  // Doesn't actually scan pixel alpha values; good enough heuristic for skipping
  // assets the script already processed.
  const buf = await fs.readFile(filePath);
  // PNG IHDR: bytes 8-23. Color type is at byte 25.
  if (buf.length < 26) return false;
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return false; // not a PNG
  const colorType = buf[25];
  return colorType === 4 || colorType === 6;
}

function parseArgs(argv: string[]): {
  only?: Set<string>;
  category?: "characters" | "props";
  force: boolean;
} {
  const out: {
    only?: Set<string>;
    category?: "characters" | "props";
    force: boolean;
  } = { force: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only" && argv[i + 1]) {
      out.only = new Set(argv[++i].split(","));
    } else if (a === "--category" && argv[i + 1]) {
      const c = argv[++i];
      if (c === "characters" || c === "props") out.category = c;
    } else if (a === "--force") {
      out.force = true;
    }
  }
  return out;
}
