// Pure helpers for client-side counter state. Counters are numeric per-
// playthrough resources (food, water) that tick down as the kid traverses
// scenes and replenish at specific scenes. Persisted to sessionStorage by
// PlayClient. Mirrors the shape of lib/flags.ts. Boolean flags stay
// boolean: counters derive booleans (food_critical, water_empty) at the
// resolver call sites, never widening the FlagState type itself.

export type CounterState = Record<string, number>;

export type CounterDef = {
  id: string;
  label: string;
  max: number;
  icon_path: string;
  // When the current value is at or below this threshold the counter is
  // "critical". Renderer pulses red. Resolver derives a {id}_critical
  // boolean flag from this for narration variants.
  critical_at: number;
  // B-014 economy: when set, initialCounters seeds this counter with
  // start_at instead of max. Used for the coins counter where max is the
  // theoretical ceiling (9999) but the kid starts with a small buffer (50).
  start_at?: number;
};

export function initialCounters(defs: CounterDef[]): CounterState {
  const out: CounterState = {};
  for (const def of defs) out[def.id] = def.start_at ?? def.max;
  return out;
}

export function applyTick(state: CounterState, tick: Record<string, number> | undefined): CounterState {
  if (!tick) return state;
  const next: CounterState = { ...state };
  for (const [id, amount] of Object.entries(tick)) {
    next[id] = Math.max(0, (next[id] ?? 0) - amount);
  }
  return next;
}

export function applyReplenish(
  state: CounterState,
  replenish: Record<string, number> | undefined,
  defs: CounterDef[]
): CounterState {
  if (!replenish) return state;
  const next: CounterState = { ...state };
  const maxById = new Map(defs.map((d) => [d.id, d.max]));
  for (const [id, amount] of Object.entries(replenish)) {
    const max = maxById.get(id) ?? Infinity;
    next[id] = Math.min(max, (next[id] ?? 0) + amount);
  }
  return next;
}

export function meetsCounter(state: CounterState, requirement: Record<string, number> | undefined): boolean {
  if (!requirement) return true;
  for (const [id, min] of Object.entries(requirement)) {
    if ((state[id] ?? 0) < min) return false;
  }
  return true;
}

// Derives boolean flags from counter values for use in narration_variants,
// prop_overrides, and ending selection. For each counter, emits two flags:
// `${id}_empty` (value <= 0) and `${id}_critical` (value <= critical_at).
// Caller merges the result into the flags object passed to resolveScene /
// selectEnding. The persisted flag state stays clean.
export function deriveCounterFlags(state: CounterState, defs: CounterDef[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of defs) {
    const value = state[def.id] ?? def.max;
    out[`${def.id}_empty`] = value <= 0;
    out[`${def.id}_critical`] = value <= def.critical_at;
  }
  return out;
}
