#!/usr/bin/env tsx
// Generate SVG placeholder assets for the entire library so the editor/player
// have something to render before real images are produced via Replicate.
// Each placeholder is a flat colored rectangle with the asset name centered.
// Backgrounds get a 16:9 aspect ratio; characters and props get 1:1.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_LIBRARY, type AssetDef } from "../lib/asset-library";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PALETTE: Record<string, { bg: string; fg: string }> = {
  backgrounds: { bg: "#fde68a", fg: "#78350f" },
  characters: { bg: "#fbcfe8", fg: "#831843" },
  props: { bg: "#bae6fd", fg: "#0c4a6e" },
};

main();

async function main() {
  let count = 0;
  for (const asset of ASSET_LIBRARY) {
    const dir = path.join(ROOT, "public/assets", asset.category);
    await fs.mkdir(dir, { recursive: true });
    const svgPath = path.join(dir, `${asset.id}.svg`);
    const svg = svgFor(asset);
    await fs.writeFile(svgPath, svg, "utf-8");
    count++;
  }
  console.log(`Wrote ${count} SVG placeholders.`);
}

function svgFor(asset: AssetDef): string {
  const isBg = asset.category === "backgrounds";
  const w = isBg ? 1600 : 800;
  const h = isBg ? 900 : 800;
  const colors = PALETTE[asset.category];
  const label = humanize(asset.id);

  // Soft icon: emoji-ish circle. Keep simple for legibility.
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.bg}"/>
      <stop offset="100%" stop-color="${shade(colors.bg, -0.18)}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${shade(colors.bg, 0.25)}" opacity="0.85"/>
  <text x="${w / 2}" y="${h * 0.78}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${Math.round(h * 0.075)}" font-weight="700" text-anchor="middle" fill="${colors.fg}">${escapeXml(label)}</text>
  <text x="${w / 2}" y="${h * 0.88}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${Math.round(h * 0.04)}" font-weight="400" text-anchor="middle" fill="${colors.fg}" opacity="0.7">${asset.category}</text>
</svg>`;
}

function humanize(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function shade(hex: string, percent: number): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const adjust = (c: number) => Math.max(0, Math.min(255, Math.round(c + 255 * percent)));
  return `#${[adjust(r), adjust(g), adjust(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}
