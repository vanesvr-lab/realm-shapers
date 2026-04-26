// Library-only adhoc prop matcher. No Replicate, no fresh generation. Given a
// kid's typed request ("a key", "some meat", "a glowing flower") we score it
// against every prop in ASSET_LIBRARY and return the best confident match, or
// no match at all. The frontend uses the result to either grant the prop (and
// have Oracle say "Granted!") or play a "not yet in this realm" beat.
//
// Scoring: id match > alt match > word/tag overlap > Levenshtein on tokens.
// We blend the signals so multi-word prompts like "a glowing flower" still
// match the "flower" prop even though "glowing" is decorative.

import { PROPS, type AssetDef } from "@/lib/asset-library";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "some",
  "any",
  "my",
  "of",
  "with",
  "and",
  "for",
  "to",
  "please",
  "i",
  "want",
  "need",
  "give",
  "me",
  "summon",
  "find",
  "get",
  "small",
  "big",
  "little",
  "new",
  "old",
]);

export type PropMatch = {
  matched: true;
  prop_id: string;
  score: number;
  alt: string;
};

export type PropMiss = {
  matched: false;
  best?: { prop_id: string; score: number; alt: string };
};

export type PropMatcherResult = PropMatch | PropMiss;

const CONFIDENCE_THRESHOLD = 0.55;
const SUGGESTION_THRESHOLD = 0.3;

export function matchProp(rawText: string): PropMatcherResult {
  const tokens = tokenize(rawText);
  if (tokens.length === 0) {
    return { matched: false };
  }

  let best: { prop: AssetDef; score: number } | null = null;
  for (const prop of PROPS) {
    const score = scoreProp(tokens, prop);
    if (!best || score > best.score) {
      best = { prop, score };
    }
  }

  if (!best) return { matched: false };

  if (best.score >= CONFIDENCE_THRESHOLD) {
    return {
      matched: true,
      prop_id: best.prop.id,
      score: best.score,
      alt: best.prop.alt,
    };
  }

  if (best.score >= SUGGESTION_THRESHOLD) {
    return {
      matched: false,
      best: {
        prop_id: best.prop.id,
        score: best.score,
        alt: best.prop.alt,
      },
    };
  }

  return { matched: false };
}

function tokenize(raw: string): string[] {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9\s_-]/g, " ");
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

function scoreProp(tokens: string[], prop: AssetDef): number {
  const idTokens = new Set(prop.id.split(/[_\s]+/).filter(Boolean));
  const altTokens = tokenize(prop.alt);
  const tagTokens = prop.tags.flatMap((t) => tokenize(t));
  const propBag = new Set([...Array.from(idTokens), ...altTokens, ...tagTokens]);

  // 1. Exact id or alt match.
  const joined = tokens.join(" ");
  if (joined === prop.id || joined.replace(/\s/g, "_") === prop.id) return 1;
  const altJoined = altTokens.join(" ");
  if (altJoined && joined === altJoined) return 0.95;

  // 2. Direct token containment with bag of synonyms.
  // Hits against the id are weighted higher than hits against alt-only words,
  // so "glowing flower" picks `flower` (id hit) over `lantern` (alt hit).
  let overlap = 0;
  let strongest = 0;
  let idHit = false;
  for (const t of tokens) {
    if (idTokens.has(t)) {
      overlap += 1.4;
      strongest = Math.max(strongest, 1);
      idHit = true;
      continue;
    }
    if (propBag.has(t)) {
      overlap += 1;
      strongest = Math.max(strongest, 1);
      continue;
    }
    // 3. Levenshtein on the closest token in the prop bag.
    let bestDist = Infinity;
    let bestLen = 0;
    let bestInId = false;
    for (const p of Array.from(propBag)) {
      const d = levenshtein(t, p);
      if (d < bestDist) {
        bestDist = d;
        bestLen = Math.max(t.length, p.length);
        bestInId = idTokens.has(p);
      }
    }
    if (bestLen > 0) {
      const sim = 1 - bestDist / bestLen;
      if (sim >= 0.75) {
        overlap += sim * (bestInId ? 1.3 : 1);
        strongest = Math.max(strongest, sim);
        if (bestInId && sim >= 0.85) idHit = true;
      }
    }
  }

  if (overlap === 0) return 0;

  // Normalize: a single perfect-token match for a one-word request returns ~0.85;
  // multi-word matches stack up. id hits on top get a small bonus so the
  // matcher prefers props whose id contains the user's noun.
  const overlapRatio = Math.min(1, overlap / tokens.length);
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
