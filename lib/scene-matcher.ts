// B-010 setting matcher. Given a free-text setting ingredient ("middle of the
// city", "underwater cave", "secret moonlit bakery") returns a ranked list of
// background ids. The story prompt feeds the top N to Claude so it picks per
// scene from a curated list instead of random library guesses. If the top
// match scores below MATCH_MIN_SIMILARITY, callers should fall back to having
// Claude generate per-scene inline_svg backgrounds.
//
// Pattern mirrors lib/prop-matcher.ts (B-008): tokenize + Levenshtein +
// keyword overlap, with a small id-token boost. Kept deliberately separate
// from the prop matcher because the search space (catalog with categories +
// keywords) and the goal (return ranked list, not single best) differ.

import { BACKGROUND_CATALOG, type BackgroundEntry } from "@/lib/backgrounds-catalog";

export const MATCH_MIN_SIMILARITY = 0.5;

export type RankedBackground = {
  id: string;
  category: string;
  score: number;
};

export type SettingMatchResult = {
  ranked: RankedBackground[];
  topScore: number;
  hasGoodMatch: boolean;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "with",
  "and",
  "or",
  "for",
  "from",
  "into",
  "by",
  "is",
  "it",
  "my",
  "our",
  "your",
  "their",
  "some",
  "any",
  "this",
  "that",
  "these",
  "those",
  "all",
  "very",
  "really",
  "small",
  "big",
  "huge",
  "tiny",
  "old",
  "new",
  "deep",
  "wide",
  "narrow",
  "middle",
  "secret",
  "hidden",
  "magical",
  "mysterious",
]);

export function matchSetting(rawText: string, topN: number = 5): SettingMatchResult {
  const tokens = tokenize(rawText);
  if (tokens.length === 0) {
    return { ranked: [], topScore: 0, hasGoodMatch: false };
  }

  const scored = BACKGROUND_CATALOG.map((entry) => ({
    entry,
    score: scoreEntry(tokens, entry),
  }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  const ranked: RankedBackground[] = scored.slice(0, topN).map((s) => ({
    id: s.entry.id,
    category: s.entry.category,
    score: s.score,
  }));

  const topScore = ranked[0]?.score ?? 0;
  return {
    ranked,
    topScore,
    hasGoodMatch: topScore >= MATCH_MIN_SIMILARITY,
  };
}

function tokenize(raw: string): string[] {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  return normalized
    .split(/\s+/)
    .map((t) => singularize(t))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 3) return word.slice(0, -3) + "y";
  if (word.endsWith("sses") || word.endsWith("shes") || word.endsWith("ches")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

function scoreEntry(tokens: string[], entry: BackgroundEntry): number {
  const idTokens = new Set(entry.id.split(/[_\s]+/).filter(Boolean));
  const categoryToken = entry.category;
  const keywordTokens = new Set(entry.keywords.flatMap((k) => tokenize(k)));
  const bag = new Set([...Array.from(idTokens), categoryToken, ...Array.from(keywordTokens)]);

  // Direct multi-word phrase match against any keyword.
  const joined = tokens.join(" ");
  for (const kw of entry.keywords) {
    if (joined === kw || joined.includes(kw)) {
      return 1;
    }
  }

  let overlap = 0;
  let strongest = 0;
  let idHit = false;

  for (const t of tokens) {
    if (idTokens.has(t) || t === categoryToken) {
      overlap += 1.4;
      strongest = Math.max(strongest, 1);
      idHit = true;
      continue;
    }
    if (bag.has(t)) {
      overlap += 1;
      strongest = Math.max(strongest, 1);
      continue;
    }
    let bestDist = Infinity;
    let bestLen = 0;
    let bestInId = false;
    for (const p of Array.from(bag)) {
      const d = levenshtein(t, p);
      if (d < bestDist) {
        bestDist = d;
        bestLen = Math.max(t.length, p.length);
        bestInId = idTokens.has(p) || p === categoryToken;
      }
    }
    if (bestLen > 0) {
      const sim = 1 - bestDist / bestLen;
      if (sim >= 0.78) {
        overlap += sim * (bestInId ? 1.3 : 1);
        strongest = Math.max(strongest, sim);
        if (bestInId && sim >= 0.85) idHit = true;
      }
    }
  }

  if (overlap === 0) return 0;

  const overlapRatio = Math.min(1, overlap / Math.max(1, tokens.length));
  const base = 0.55 * strongest + 0.45 * overlapRatio;
  return Math.min(1, base + (idHit ? 0.08 : 0));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0);
  const curr = new Array(b.length + 1).fill(0);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}
