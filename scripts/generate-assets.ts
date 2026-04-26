#!/usr/bin/env tsx
// Generate the asset library via Replicate Flux Schnell.
// Usage: npx tsx scripts/generate-assets.ts [--only id1,id2] [--category backgrounds|characters|props] [--force]
// Skips assets that already exist on disk unless --force is passed.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";
import { ASSET_LIBRARY, type AssetDef } from "../lib/asset-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MODEL = "black-forest-labs/flux-schnell" as const;
const CONCURRENCY = 1;

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
  const target: AssetDef[] = ASSET_LIBRARY.filter((a) => {
    if (args.only && !args.only.includes(a.id)) return false;
    if (args.category && a.category !== args.category) return false;
    return true;
  });

  console.log(`Generating ${target.length} assets...`);

  let done = 0;
  let failed = 0;
  const queue = [...target];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const asset = queue.shift();
        if (!asset) break;
        const dir = path.join(ROOT, "public/assets", asset.category);
        await fs.mkdir(dir, { recursive: true });
        const out = path.join(dir, asset.filename);
        if (!args.force) {
          try {
            await fs.stat(out);
            done++;
            console.log(`[skip] ${asset.id} (exists)`);
            continue;
          } catch {
            // not present, generate
          }
        }
        try {
          const buf = await generateOne(asset);
          await fs.writeFile(out, buf);
          done++;
          console.log(`[ok ${done}/${target.length}] ${asset.category}/${asset.id}`);
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[fail] ${asset.id}: ${msg}`);
        }
        // Throttle to stay under 6 req/min rate limit (gives 11s cushion)
        await new Promise((resolve) => setTimeout(resolve, 11000));
      }
    })
  );

  console.log(`\nDone. ${done - failed} succeeded, ${failed} failed.`);
  if (failed > 0) process.exit(2);
}

async function generateOne(asset: AssetDef): Promise<Buffer> {
  const aspect = asset.category === "backgrounds" ? "16:9" : "1:1";
  const input = {
    prompt: asset.prompt,
    aspect_ratio: aspect,
    num_outputs: 1,
    output_format: "png",
    output_quality: 90,
    num_inference_steps: 4,
    disable_safety_checker: false,
    megapixels: "1",
  };

  const output = await client.run(MODEL, { input });
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) throw new Error("No output from Replicate");

  if (typeof first === "string") {
    const res = await fetch(first);
    if (!res.ok) throw new Error(`fetch ${first} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first instanceof ReadableStream) {
    const reader = first.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  const fo = first as { blob?: () => Promise<Blob>; url?: () => string | URL };
  if (typeof fo.blob === "function") {
    const blob = await fo.blob();
    return Buffer.from(await blob.arrayBuffer());
  }
  if (typeof fo.url === "function") {
    const url = fo.url();
    const u = typeof url === "string" ? url : url.toString();
    const res = await fetch(u);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`Unexpected Replicate output: ${typeof first}`);
}

function parseArgs(argv: string[]): { only: string[] | null; category: string | null; force: boolean } {
  const out: { only: string[] | null; category: string | null; force: boolean } = {
    only: null,
    category: null,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") out.force = true;
    else if (a === "--only") out.only = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--category") out.category = argv[++i];
  }
  return out;
}
