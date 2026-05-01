"use client";
import { useEffect, useState } from "react";
import { speakOracle } from "@/lib/oracle-bus";

// Adventure slice: scripted Oracle dialogue shown at the start of an
// adventure. Renders one line at a time; kid taps to advance. The first
// line auto-fires on mount (and triggers the existing speakOracle bus, so
// the Oracle character lights up + ElevenLabs narration kicks in if wired).
// onComplete fires after the last line is dismissed; PlayClient uses that
// to transition into StarterPicker.

export function OraclePrologue({
  lines,
  onComplete,
}: {
  lines: string[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);

  // Speak via the Oracle bus on each line change so the existing Oracle
  // visual + audio pipeline reacts. Skip if lines is empty.
  useEffect(() => {
    if (lines.length === 0) return;
    if (index >= lines.length) return;
    speakOracle({ text: lines[index], kind: "ceremony" });
  }, [index, lines]);

  if (lines.length === 0) {
    // No prologue lines; bypass.
    onComplete();
    return null;
  }

  function advance() {
    if (index + 1 >= lines.length) {
      onComplete();
      return;
    }
    setIndex(index + 1);
  }

  const isLast = index + 1 >= lines.length;
  const current = lines[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm cursor-pointer"
      onClick={advance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") advance();
      }}
      aria-label="Advance Oracle dialogue"
    >
      <div className="w-full max-w-2xl mx-4 mb-8 sm:mb-0 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-2xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-amber-700 mb-2">The Oracle</p>
        <p className="text-lg sm:text-xl text-slate-800 leading-relaxed">{current}</p>
        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          <span>
            {index + 1} of {lines.length}
          </span>
          <span className="text-amber-700 font-semibold">
            {isLast ? "Tap to begin" : "Tap to continue"}
          </span>
        </div>
      </div>
    </div>
  );
}
