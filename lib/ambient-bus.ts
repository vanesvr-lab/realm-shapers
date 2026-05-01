"use client";

// B-012 scope 5. Ambient sound bus, mirror of oracle-bus but for looping
// background ambience (water, wind, banner flap on Drawbridge etc.). One
// shared HTMLAudioElement; callers ask for a track id, the bus fetches the
// signed url from /api/ambient (cached server-side in oracle_voice), and
// loops at low volume. Mute state is persisted in localStorage under a
// dedicated key so it stays separate from the Oracle TTS mute.
//
// Respects the no-autoplay rule: never starts playback until
// hasUserInteracted() (from oracle-bus) is true. The first scene mount runs
// after the kid has clicked through the landing form, so this is normally
// satisfied. If autoplay is denied by the browser, the bus stays silent and
// retries on the next playAmbient() call.

import { hasUserInteracted } from "@/lib/oracle-bus";

const MUTE_KEY = "realm-shapers:ambient-muted";
const MUTE_EVENT = "realm-shapers:ambient-mute-changed";
const VOLUME = 0.3;
const FADE_MS = 600;

let audioEl: HTMLAudioElement | null = null;
let currentTrackId: string | null = null;
const urlByTrackId: Record<string, string> = {};
let pendingLoad: string | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function getOrCreateAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (audioEl) return audioEl;
  const el = document.createElement("audio");
  el.loop = true;
  el.preload = "auto";
  el.volume = isAmbientMuted() ? 0 : VOLUME;
  audioEl = el;
  return el;
}

function clearFade(): void {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function fadeTo(targetVol: number, onComplete?: () => void): void {
  const el = audioEl;
  if (!el) {
    onComplete?.();
    return;
  }
  clearFade();
  const startVol = el.volume;
  const startedAt = Date.now();
  fadeTimer = setInterval(() => {
    const t = Math.min(1, (Date.now() - startedAt) / FADE_MS);
    el.volume = startVol + (targetVol - startVol) * t;
    if (t >= 1) {
      clearFade();
      onComplete?.();
    }
  }, 30);
}

async function ensureUrlFor(trackId: string): Promise<string | null> {
  if (urlByTrackId[trackId]) return urlByTrackId[trackId];
  if (pendingLoad === trackId) return null;
  pendingLoad = trackId;
  try {
    const res = await fetch("/api/ambient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_id: trackId }),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) return null;
    urlByTrackId[trackId] = data.url as string;
    return urlByTrackId[trackId];
  } catch {
    return null;
  } finally {
    if (pendingLoad === trackId) pendingLoad = null;
  }
}

export async function playAmbient(trackId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (currentTrackId === trackId && audioEl && !audioEl.paused) {
    if (!isAmbientMuted()) fadeTo(VOLUME);
    return;
  }
  currentTrackId = trackId;
  const el = getOrCreateAudio();
  if (!el) return;
  const url = await ensureUrlFor(trackId);
  if (!url || currentTrackId !== trackId) return;
  if (el.src !== url) {
    el.src = url;
  }
  if (isAmbientMuted()) {
    el.volume = 0;
  }
  if (!hasUserInteracted()) return;
  try {
    await el.play();
    if (!isAmbientMuted()) fadeTo(VOLUME);
  } catch {
    // Autoplay denied; will retry on next playAmbient call.
  }
}

export function stopAmbient(): void {
  if (typeof window === "undefined") return;
  currentTrackId = null;
  const el = audioEl;
  if (!el) return;
  fadeTo(0, () => {
    el.pause();
  });
}

export function isAmbientMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAmbientMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) {
      localStorage.setItem(MUTE_KEY, "1");
    } else {
      localStorage.removeItem(MUTE_KEY);
    }
  } catch {
    // ignore
  }
  const el = audioEl;
  if (el) {
    if (muted) {
      fadeTo(0);
    } else if (currentTrackId && hasUserInteracted()) {
      // Resume volume; if paused, also kick off play.
      if (el.paused) {
        el.play().catch(() => {});
      }
      fadeTo(VOLUME);
    }
  }
  window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: muted }));
}

export function subscribeAmbientMute(handler: (muted: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapper = (e: Event) => {
    const ce = e as CustomEvent<boolean>;
    handler(ce.detail);
  };
  window.addEventListener(MUTE_EVENT, wrapper as EventListener);
  return () => window.removeEventListener(MUTE_EVENT, wrapper as EventListener);
}
