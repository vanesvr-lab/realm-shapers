#!/usr/bin/env tsx
// One-shot: generate public/oracle.png via Replicate Flux Schnell.
// Usage: npx tsx --env-file=.env.local scripts/generate-oracle.ts [--force]

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/oracle.png");

const force = process.argv.includes("--force");

const PROMPT =
  "warm magical Oracle character portrait, an older woman with kind crinkly eyes, soft smile, flowing midnight blue robe with tiny golden stars, silver hair tied back, gentle glowing aura, friendly grandmother energy, soft Studio Ghibli watercolor style, magical children's book illustration, warm friendly lighting, painted texture, kid friendly, white background, no text, no letters, no words, centered, head and shoulders portrait, looking softly at the viewer";

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
  if (!force) {
    try {
      await fs.stat(OUT);
      console.log(`oracle.png already exists at ${OUT}; pass --force to regen`);
      return;
    } catch {
      // not present, continue
    }
  }
  console.log("Generating oracle portrait...");
  const buf = await generateOne();
  await fs.writeFile(OUT, buf);
  console.log(`Wrote ${OUT} (${buf.length} bytes)`);
}

async function generateOne(): Promise<Buffer> {
  const input = {
    prompt: PROMPT,
    aspect_ratio: "1:1",
    num_outputs: 1,
    output_format: "png",
    output_quality: 95,
    num_inference_steps: 4,
    disable_safety_checker: false,
    megapixels: "1",
  };
  const output = await client.run("black-forest-labs/flux-schnell", { input });
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) throw new Error("No output from Replicate");
  if (typeof first === "string") {
    const res = await fetch(first);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (first instanceof ReadableStream) {
    const reader = first.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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
