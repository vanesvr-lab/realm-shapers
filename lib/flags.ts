// Pure helpers for client-side flag state. B-009: per-playthrough flag set
// the kid accumulates as they play, used by the scene resolver to pick
// narration variants, prop overrides, and the right ending at finale.

export type FlagState = Record<string, boolean>;

export function matchesWhen(when: Record<string, boolean>, flags: FlagState): boolean {
  for (const [key, expected] of Object.entries(when)) {
    if ((flags[key] ?? false) !== expected) return false;
  }
  return true;
}

export function pickVariant<T extends { when: Record<string, boolean> }>(
  variants: T[] | undefined,
  flags: FlagState,
  fallback: null
): T | null {
  if (!variants || variants.length === 0) return fallback;
  for (const v of variants) {
    if (matchesWhen(v.when, flags)) return v;
  }
  return fallback;
}

export function setFlag(state: FlagState, id: string, value: boolean): FlagState {
  if (state[id] === value) return state;
  return { ...state, [id]: value };
}
