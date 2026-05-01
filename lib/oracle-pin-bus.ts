"use client";

// B-018: small bus that lets the active StoryPlayer turn the global
// OracleAvatar into a play-mode pin: a remaining-hint badge sits on the
// oracle face, and tapping the avatar fires the StoryPlayer's Ask Oracle
// behavior instead of the default greet. When StoryPlayer unmounts (kid
// leaves the realm, hits the ending, swaps to editor), the bus clears and
// the avatar reverts to its normal greet behavior.

export type OraclePinState = {
  // Remaining Ask Oracle hints. The avatar shows a badge only when this
  // is > 0. When 0, the avatar still answers tap with a "no more hints"
  // line via onTap.
  hintsLeft: number;
  // Maximum hint budget for the realm. Used to hide the badge entirely
  // for non-adventure worlds (budget = 0).
  hintBudget: number;
  // Called when the kid taps the avatar. StoryPlayer wires this to the
  // same handler the inline Ask Oracle button used to call.
  onTap: () => void;
};

let current: OraclePinState | null = null;
const listeners = new Set<(state: OraclePinState | null) => void>();

export function setOraclePin(state: OraclePinState | null): void {
  current = state;
  listeners.forEach((l) => l(state));
}

export function getOraclePin(): OraclePinState | null {
  return current;
}

export function subscribeOraclePin(
  handler: (state: OraclePinState | null) => void
): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
