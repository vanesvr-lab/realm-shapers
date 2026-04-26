"use client";

export type OracleLineKind =
  | "greet"
  | "ceremony"
  | "scene_intro"
  | "achievement"
  | "completion"
  | "hint"
  | "discovery";

export type OracleLine = {
  text: string;
  kind: OracleLineKind;
  // Optional: callers can mark a line as low-priority; if a higher-priority
  // line is currently speaking, lower-priority lines are dropped silently.
  priority?: number;
};

const EVENT_NAME = "realm-shapers:oracle-speak";
const INTERACTION_KEY = "realm-shapers:user-interacted";

export function speakOracle(line: OracleLine | string): void {
  if (typeof window === "undefined") return;
  const payload: OracleLine =
    typeof line === "string" ? { text: line, kind: "scene_intro" } : line;
  window.dispatchEvent(new CustomEvent<OracleLine>(EVENT_NAME, { detail: payload }));
}

export function subscribeOracle(handler: (line: OracleLine) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapper = (e: Event) => {
    const ce = e as CustomEvent<OracleLine>;
    if (ce.detail) handler(ce.detail);
  };
  window.addEventListener(EVENT_NAME, wrapper as EventListener);
  return () => window.removeEventListener(EVENT_NAME, wrapper as EventListener);
}

export function markUserInteraction(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTERACTION_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasUserInteracted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INTERACTION_KEY) === "1";
  } catch {
    return false;
  }
}
