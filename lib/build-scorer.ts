// B-019 heuristic build-prompt scorer. Returns a 1-5 level for any
// non-empty prompt. The kid sees the level update in real time as they
// type so they can iterate before submitting. Scoring is intentionally
// generous: the goal is to teach detail-rich prompting, not to reject.
//
// Rubric (each adds at most one point):
//   +1 material : a known pickup material id (or its alt form) appears
//   +1 role     : "you are a", "as a", "expert", "skilled", "master", etc.
//   +1 constraint : "must", "should", "without", "no more than", etc.
//   +1 use case : "to cross", "to carry", "for the", "so that", etc.
//   +1 specifics : a number or a sized/colored/textured detail
//
// Floor 1 (any non-empty prompt is at least level 1). Cap 5.

import { MATERIAL_IDS } from "@/lib/pickups-catalog";

// Words and short phrases that indicate the kid has named a material.
// Includes the catalog ids plus their natural-English equivalents so the
// kid does not have to type "wood_logs" to score the material point.
function buildMaterialVocab(): string[] {
  const vocab = new Set<string>();
  for (const id of MATERIAL_IDS) {
    vocab.add(id.replace(/_/g, " "));
    vocab.add(id);
  }
  // Items that can be combined or referenced by name even though they
  // are not raw materials in the shop sense (the kid still gets credit
  // for naming them in a prompt).
  for (const extra of [
    "sword",
    "blade",
    "lantern",
    "torch",
    "rope",
    "wood",
    "stone",
    "candle",
    "string",
  ]) {
    vocab.add(extra);
  }
  return Array.from(vocab);
}

const MATERIAL_VOCAB = buildMaterialVocab();

const ROLE_PATTERNS: RegExp[] = [
  /\byou are an? \w+/i,
  /\bas an? \w+/i,
  /\b(expert|skilled|master|seasoned|legendary)\b/i,
];

const CONSTRAINT_PATTERNS: RegExp[] = [
  /\bmust\b/i,
  /\bshould\b/i,
  /\bwon'?t\b/i,
  /\bcannot\b/i,
  /\bwithout\b/i,
  /\bat least\b/i,
  /\bno more than\b/i,
  /\bstrong enough\b/i,
  /\bbig enough\b/i,
  /\bsmall enough\b/i,
  /\blight enough\b/i,
];

const USE_CASE_PATTERNS: RegExp[] = [
  /\bto (cross|carry|hold|catch|reach|cut|light|float|fly|hide|fight|sail|sing|charm|calm)\b/i,
  /\bso that\b/i,
  /\bin order to\b/i,
  /\bfor the\b/i,
  /\bagainst\b/i,
  /\bacross\b/i,
];

const SPECIFICS_PATTERNS: RegExp[] = [
  /\b\d+\b/, // any number
  /\b(red|blue|green|yellow|gold|silver|black|white|brown|orange|purple|pink)\b/i,
  /\b(thick|thin|tall|short|wide|narrow|huge|tiny|heavy|light|smooth|rough)\b/i,
  /\b(braided|woven|carved|polished|knotted|sharpened)\b/i,
];

export type ScoreBreakdown = {
  level: number;
  hasMaterial: boolean;
  hasRole: boolean;
  hasConstraint: boolean;
  hasUseCase: boolean;
  hasSpecifics: boolean;
};

export function scoreBuildPrompt(promptRaw: string): ScoreBreakdown {
  const prompt = promptRaw.trim();
  if (prompt.length === 0) {
    return {
      level: 0,
      hasMaterial: false,
      hasRole: false,
      hasConstraint: false,
      hasUseCase: false,
      hasSpecifics: false,
    };
  }
  const lower = prompt.toLowerCase();

  const hasMaterial = MATERIAL_VOCAB.some((word) => {
    if (word.includes(" ")) return lower.includes(word);
    const re = new RegExp(`\\b${word}\\b`);
    return re.test(lower);
  });
  const hasRole = ROLE_PATTERNS.some((re) => re.test(prompt));
  const hasConstraint = CONSTRAINT_PATTERNS.some((re) => re.test(prompt));
  const hasUseCase = USE_CASE_PATTERNS.some((re) => re.test(prompt));
  const hasSpecifics = SPECIFICS_PATTERNS.some((re) => re.test(prompt));

  const points =
    (hasMaterial ? 1 : 0) +
    (hasRole ? 1 : 0) +
    (hasConstraint ? 1 : 0) +
    (hasUseCase ? 1 : 0) +
    (hasSpecifics ? 1 : 0);

  // Floor at 1 (any non-empty prompt is at least level 1).
  const level = Math.max(1, Math.min(5, points));

  return {
    level,
    hasMaterial,
    hasRole,
    hasConstraint,
    hasUseCase,
    hasSpecifics,
  };
}

// Kid-friendly Oracle line tuned to the level. Returned as a single
// sentence; StoryPlayer threads it through the existing speakOracle.
export function buildFeedbackLine(targetLabel: string, level: number): string {
  switch (level) {
    case 1:
      return `It works. Mostly. Add more detail next time and your ${targetLabel} will be sturdier.`;
    case 2:
      return `A passable ${targetLabel}. With another detail or two, it would shine.`;
    case 3:
      return `A solid ${targetLabel}. Builders nod when they see this kind of work.`;
    case 4:
      return `A craftsman's ${targetLabel}. Strong, careful, well done.`;
    case 5:
    default:
      return `A masterwork ${targetLabel}. The realm will respect this.`;
  }
}
