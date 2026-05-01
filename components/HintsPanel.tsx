"use client";

// B-019: read-only running list of every Oracle hint the kid has heard
// this run. Hints are captured by StoryPlayer subscribing to the oracle
// bus and filtering on kind === "hint". The panel lets the kid scroll
// back when they forget what the Oracle whispered five scenes ago.

import { motion, AnimatePresence } from "framer-motion";

export type HeardHint = {
  sceneId: string;
  sceneTitle: string;
  text: string;
  ts: number;
};

export function HintsPanel({
  hints,
  onClose,
}: {
  hints: HeardHint[];
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="hints-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Hints heard"
        onClick={onClose}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-amber-100">
            What the Oracle whispered
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close hints"
            className="px-3 py-1.5 rounded-lg bg-white/95 text-amber-900 font-semibold text-sm shadow"
          >
            Close
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-900/70 ring-1 ring-amber-200/30 p-3 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {hints.length === 0 ? (
            <p className="text-amber-100/80 text-sm">
              No hints yet. Tap the Oracle when you are stuck.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {hints.map((h, i) => (
                <li
                  key={`${h.ts}-${i}`}
                  className="bg-white/95 rounded-lg p-3 shadow text-amber-950"
                >
                  <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
                    {h.sceneTitle}
                  </div>
                  <p className="text-sm leading-snug">{h.text}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
