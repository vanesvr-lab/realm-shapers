"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { InteractableKind } from "@/lib/claude";

const KIND_ICONS: Record<InteractableKind, string> = {
  door: "🚪",
  chest: "🎁",
  path: "🌿",
  sparkle: "✨",
  creature: "🐾",
};

const KIND_COLORS: Record<InteractableKind, string> = {
  door: "rgba(255, 215, 130, 0.95)",
  chest: "rgba(255, 200, 110, 0.95)",
  path: "rgba(170, 230, 170, 0.95)",
  sparkle: "rgba(255, 240, 170, 0.95)",
  creature: "rgba(255, 195, 180, 0.95)",
};

export function Interactable({
  kind,
  label,
  locked,
  hint,
  sideQuest,
  onActivate,
  positionStyle,
}: {
  kind: InteractableKind;
  label: string;
  locked: boolean;
  hint?: string;
  sideQuest?: boolean;
  onActivate: () => void;
  positionStyle: React.CSSProperties;
}) {
  const [showHint, setShowHint] = useState(false);

  function handleClick() {
    if (locked) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2200);
      return;
    }
    onActivate();
  }

  return (
    <motion.div
      className="absolute pointer-events-auto"
      style={positionStyle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className="group relative flex flex-col items-center gap-1 outline-none"
      >
        <motion.span
          className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full"
          style={{
            background: `radial-gradient(circle, ${KIND_COLORS[kind]} 0%, rgba(255,200,90,0.25) 60%, rgba(255,200,90,0) 100%)`,
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          <span
            className="relative z-10 text-3xl sm:text-4xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            aria-hidden
          >
            {KIND_ICONS[kind]}
          </span>
          {locked && (
            <span
              className="absolute -bottom-1 -right-1 z-20 w-7 h-7 rounded-full bg-slate-800/90 text-amber-100 text-sm flex items-center justify-center shadow ring-2 ring-amber-200"
              aria-label="locked"
            >
              🔒
            </span>
          )}
          {sideQuest && (
            <span
              className="absolute -top-2 -right-2 z-20 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-300 to-purple-300 text-purple-950 text-[10px] font-bold shadow ring-1 ring-fuchsia-200 whitespace-nowrap"
              aria-label="side quest"
            >
              ✨ side
            </span>
          )}
        </motion.span>
        <span className="px-2 py-0.5 rounded-full bg-black/60 text-amber-50 text-xs sm:text-sm font-semibold whitespace-nowrap shadow opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition">
          {label}
        </span>
        {showHint && hint && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-9 px-3 py-1 rounded-full bg-white/95 text-amber-900 text-xs font-semibold shadow border border-amber-200 whitespace-nowrap"
          >
            {hint}
          </motion.span>
        )}
      </button>
    </motion.div>
  );
}
