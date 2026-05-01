"use client";

// B-014 economy: tiny Web Audio coin chime. Synthesizes a quick two-tone
// bell via OscillatorNode, no audio file required. Fired by StoryPlayer
// pickup() when a treasure with coin_value lands in inventory and by
// tryActivate() when a choice spends or grants coins. Honors a session
// mute flag (separate from ambient mute) so kids who mute the page once
// stay quiet on subsequent transactions.
//
// Respects the no-autoplay rule: AudioContext is created lazily on the
// first call, which always happens after a tap (pickup or choice). All
// errors are swallowed so a quirky browser does not break gameplay.

const MUTE_KEY = "realm-shapers:sound-muted";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (muted) sessionStorage.setItem(MUTE_KEY, "1");
    else sessionStorage.removeItem(MUTE_KEY);
  } catch {
    // ignore
  }
}

export function playChing(): void {
  if (typeof window === "undefined") return;
  if (isSoundMuted()) return;
  const audio = getContext();
  if (!audio) return;
  try {
    if (audio.state === "suspended") {
      audio.resume().catch(() => {});
    }
    const now = audio.currentTime;
    playTone(audio, 1318.51, now, 0.09, 0.18);
    playTone(audio, 1567.98, now + 0.07, 0.11, 0.16);
  } catch {
    // ignore; first call on Safari without a gesture can throw
  }
}

function playTone(
  audio: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  peak: number
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}
