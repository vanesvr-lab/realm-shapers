"use client";

// B-010 scope 9: parallel pub/sub for the kid's chosen hero. Mirrors
// lib/oracle-bus.ts but on its own event channel so the Oracle and the
// hero can speak independently without their audio elements stepping on
// each other.

export type HeroLineKind = "thought" | "joke";

export type HeroLine = {
  text: string;
  kind: HeroLineKind;
  // Picked on a per-realm basis by Claude (Fena for girl-coded heroes,
  // Ryan for boy-coded). Subscribers should fall back to a sensible default
  // when missing.
  voice_id?: string;
};

const EVENT_NAME = "realm-shapers:hero-speak";

export function speakHero(line: HeroLine): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HeroLine>(EVENT_NAME, { detail: line }));
}

export function subscribeHero(handler: (line: HeroLine) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapper = (e: Event) => {
    const ce = e as CustomEvent<HeroLine>;
    if (ce.detail) handler(ce.detail);
  };
  window.addEventListener(EVENT_NAME, wrapper as EventListener);
  return () => window.removeEventListener(EVENT_NAME, wrapper as EventListener);
}
