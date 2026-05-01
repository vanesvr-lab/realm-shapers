#!/usr/bin/env tsx
// Strips the background from the wizard character image using Replicate's
// 851-labs/background-remover model and writes a transparent PNG. Run:
//
//   npx tsx --env-file=.env.local scripts/remove-wizard-bg.ts
//
// After this runs, also run:
//   npx tsx scripts/sync-asset-files.ts
// so lib/asset-files.generated.ts knows the wizard is now a .png.
//
// The original .webp files are deleted by this script (renamed via
// overwrite), so the asset library cleanly switches to PNG with alpha.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Replicate from "replicate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// The wizard exists at two paths (HeroAvatar render + asset library mirror).
// Both need the same background-stripped output.
const SOURCES = [
  "public/characters/wizard.webp",
  "public/assets/characters/wizard.webp",
];

const MODEL =
  "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

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
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Read the source once (both targets get the same output bytes).
  const sourcePath = path.join(ROOT, SOURCES[0]);
  let sourceBytes: Buffer;
  try {
    sourceBytes = await fs.readFile(sourcePath);
  } catch (err) {
    console.error(`Source missing: ${SOURCES[0]}`);
    throw err;
  }
  const dataUrl = `data:image/webp;base64,${sourceBytes.toString("base64")}`;

  console.log(
    `Removing background from wizard via ${MODEL.split(":")[0]} (may take 20-60s)...`
  );
  const t0 = Date.now();
  const output = await replicate.run(MODEL, { input: { image: dataUrl } });

  // Replicate returns a URL or array of URLs. Normalize to a single URL.
  const outputUrl = Array.isArray(output) ? String(output[0]) : String(output);
  const res = await fetch(outputUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch model output: ${res.status} ${res.statusText}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  generated ${bytes.length} bytes in ${dt}s`);

  for (const relWebp of SOURCES) {
    const webpPath = path.join(ROOT, relWebp);
    const pngPath = webpPath.replace(/\.webp$/, ".png");
    // Write the new PNG (with alpha).
    await fs.writeFile(pngPath, bytes);
    console.log(`  wrote ${path.relative(ROOT, pngPath)} (${formatBytes(bytes.length)})`);
    // Remove the old .webp so the asset library switches cleanly.
    try {
      await fs.unlink(webpPath);
      console.log(`  removed ${path.relative(ROOT, webpPath)}`);
    } catch {
      // already gone, ignore
    }
  }

  console.log(
    "\nDone. Now run: npx tsx scripts/sync-asset-files.ts  to update lib/asset-files.generated.ts"
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
