// B-011 scope 3 placeholder SVG generator. Walks the themes + characters
// catalogs and writes a simple SVG to each sub-scene.file_path / character
// .thumbnail_path / theme.thumbnail_path. Each placeholder is a base color
// rect + 2-3 silhouette shapes hinting at the location + a small label
// in the bottom-right corner. These are stand-ins; real watercolor art swaps
// in via a future asset-gen run without touching the catalog.
//
// Run once during B-011 implementation:
//   npx tsx scripts/generate-b011-placeholders.ts
// Re-run safe (overwrites). Idempotent.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { THEMES } from "../lib/themes-catalog";
import { CHARACTERS } from "../lib/characters-catalog";

const PUBLIC = join(process.cwd(), "public");

type ThemePalette = {
  bg: string;
  accent1: string;
  accent2: string;
  silhouette: string;
};

const PALETTE: Record<string, ThemePalette> = {
  castle: { bg: "#7c8aa1", accent1: "#a3a8b8", accent2: "#5a6478", silhouette: "#3a4150" },
  forest: { bg: "#4a7c59", accent1: "#6fa97f", accent2: "#2f5a3d", silhouette: "#1d3a26" },
  candy_land: { bg: "#f7b6c4", accent1: "#ffd6e0", accent2: "#c97aa1", silhouette: "#7b4a64" },
  city: { bg: "#6b7c93", accent1: "#a3b1c2", accent2: "#3f4a5b", silhouette: "#22293a" },
  space: { bg: "#1b1d3a", accent1: "#3a3f6b", accent2: "#0f1024", silhouette: "#7a82c4" },
  underwater: { bg: "#337a93", accent1: "#5fb3c8", accent2: "#1d4f63", silhouette: "#0f3242" },
};

function ensureDir(filePath: string): void {
  const abs = join(PUBLIC, filePath.replace(/^\//, ""));
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeAsset(filePath: string, svg: string): void {
  ensureDir(filePath);
  const abs = join(PUBLIC, filePath.replace(/^\//, ""));
  writeFileSync(abs, svg);
}

// Hash label to a small set of silhouette shape recipes so different
// sub-scenes look different from each other within the same theme.
function pickShapeIdx(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function backgroundShapes(themeId: string, label: string, paletteForTheme: ThemePalette): string {
  const idx = pickShapeIdx(label, 6);
  const s = paletteForTheme.silhouette;
  const a1 = paletteForTheme.accent1;
  const a2 = paletteForTheme.accent2;
  switch (idx) {
    case 0:
      return `<polygon points="0,720 240,520 480,640 760,440 1040,580 1320,420 1600,560 1600,900 0,900" fill="${s}" opacity="0.85"/>
  <polygon points="0,800 320,700 640,760 960,680 1280,740 1600,700 1600,900 0,900" fill="${a2}" opacity="0.6"/>`;
    case 1:
      return `<rect x="200" y="380" width="180" height="380" fill="${s}"/>
  <rect x="500" y="280" width="220" height="480" fill="${a2}" opacity="0.85"/>
  <rect x="900" y="340" width="200" height="420" fill="${s}"/>
  <rect x="1240" y="240" width="220" height="520" fill="${a2}" opacity="0.85"/>`;
    case 2:
      return `<circle cx="800" cy="500" r="220" fill="${a2}" opacity="0.7"/>
  <ellipse cx="800" cy="780" rx="900" ry="100" fill="${s}" opacity="0.6"/>
  <circle cx="1200" cy="240" r="80" fill="${a1}" opacity="0.7"/>`;
    case 3:
      return `<polygon points="0,600 400,420 760,540 1080,360 1400,520 1600,460 1600,900 0,900" fill="${s}" opacity="0.85"/>
  <circle cx="320" cy="240" r="60" fill="${a1}" opacity="0.6"/>
  <circle cx="1180" cy="200" r="44" fill="${a1}" opacity="0.5"/>`;
    case 4:
      return `<path d="M0,720 Q400,500 800,680 T1600,640 L1600,900 L0,900 Z" fill="${s}" opacity="0.8"/>
  <path d="M0,800 Q400,720 800,820 T1600,760 L1600,900 L0,900 Z" fill="${a2}" opacity="0.6"/>`;
    case 5:
    default:
      return `<rect x="0" y="640" width="1600" height="260" fill="${s}" opacity="0.7"/>
  <polygon points="600,640 800,360 1000,640" fill="${a2}"/>
  <polygon points="300,640 460,440 620,640" fill="${a2}" opacity="0.7"/>
  <polygon points="1100,640 1280,420 1460,640" fill="${a2}" opacity="0.7"/>`;
  }
}

function backgroundSvg(themeId: string, subSceneId: string, label: string): string {
  const p = PALETTE[themeId] ?? PALETTE.forest;
  const labelText = `placeholder: ${subSceneId}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
  <rect width="1600" height="900" fill="${p.bg}"/>
  <rect width="1600" height="640" fill="${p.accent1}" opacity="0.55"/>
  ${backgroundShapes(themeId, label, p)}
  <text x="1580" y="880" text-anchor="end" font-family="ui-monospace, Menlo, monospace" font-size="22" fill="rgba(0,0,0,0.55)">${labelText}</text>
</svg>`;
}

function characterSvg(charId: string, label: string): string {
  // Simple silhouette inside a soft circle.
  const colors: Record<string, { ring: string; body: string; accent: string }> = {
    knight: { ring: "#cfd5e1", body: "#5a6478", accent: "#a3a8b8" },
    wizard: { ring: "#e6d8ff", body: "#5b3f99", accent: "#f4c243" },
    princess: { ring: "#ffe1ec", body: "#c95a8a", accent: "#f4c243" },
    astronaut: { ring: "#dde3ee", body: "#e6e9f0", accent: "#3a72d4" },
    merkid: { ring: "#bfe6ee", body: "#3aa1b7", accent: "#f7b6c4" },
    gingerbread_kid: { ring: "#f7d8a8", body: "#a36a3a", accent: "#fff" },
    robot: { ring: "#d8dde6", body: "#9aa3b0", accent: "#3aa1b7" },
    dragon: { ring: "#e6d8f5", body: "#7c5cb0", accent: "#f4c243" },
  };
  const c = colors[charId] ?? { ring: "#d8d8d8", body: "#666", accent: "#fff" };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <circle cx="200" cy="200" r="180" fill="${c.ring}"/>
  <circle cx="200" cy="160" r="56" fill="${c.body}"/>
  <path d="M120,320 Q200,220 280,320 Z" fill="${c.body}"/>
  <circle cx="184" cy="156" r="6" fill="${c.accent}"/>
  <circle cx="216" cy="156" r="6" fill="${c.accent}"/>
  <text x="380" y="388" text-anchor="end" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="rgba(0,0,0,0.55)">placeholder: ${charId}</text>
</svg>`;
}

function themeSvg(themeId: string, label: string): string {
  const p = PALETTE[themeId] ?? PALETTE.forest;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
  <rect width="400" height="240" fill="${p.bg}"/>
  <rect width="400" height="180" fill="${p.accent1}" opacity="0.6"/>
  <polygon points="0,180 80,140 160,170 240,120 320,160 400,140 400,240 0,240" fill="${p.silhouette}" opacity="0.8"/>
  <text x="20" y="40" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="700" fill="rgba(255,255,255,0.92)">${label}</text>
  <text x="20" y="62" font-family="ui-sans-serif, system-ui" font-size="12" fill="rgba(255,255,255,0.78)">placeholder</text>
</svg>`;
}

let count = 0;
for (const theme of THEMES) {
  for (const sub of theme.sub_scenes) {
    const svg = backgroundSvg(theme.id, sub.id, sub.label);
    writeAsset(sub.file_path, svg);
    count += 1;
  }
  writeAsset(theme.thumbnail_path, themeSvg(theme.id, theme.label));
}
for (const c of CHARACTERS) {
  writeAsset(c.thumbnail_path, characterSvg(c.id, c.label));
}

console.log(
  `wrote ${count} sub-scene backgrounds, ${THEMES.length} theme thumbnails, ${CHARACTERS.length} character thumbnails`
);
