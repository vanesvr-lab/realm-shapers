"use client";
import { motion } from "framer-motion";
import type { ChoiceOption } from "@/lib/claude";

// Two-button fork UI for is_choice_scene scenes. Replaces the normal
// Interactable layout in StoryPlayer for that scene only. Style language
// matches Interactable: warm gradient, glowing ring on hover, large tap
// target. The choice scene's narration sets up the fork; this component
// just renders the two visible options.

export function ChoiceMoment({
  options,
  onChoose,
}: {
  options: ChoiceOption[];
  onChoose: (option: ChoiceOption) => void;
}) {
  if (options.length !== 2) return null;
  return (
    <div className="absolute inset-x-0 bottom-[18%] z-10 flex justify-center pointer-events-none">
      <div className="flex flex-wrap gap-4 sm:gap-6 justify-center pointer-events-auto px-4">
        {options.map((opt, i) => (
          <motion.button
            key={`choice-${i}`}
            type="button"
            onClick={() => onChoose(opt)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: "easeOut" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="relative px-5 py-4 sm:px-7 sm:py-5 rounded-2xl bg-gradient-to-br from-amber-100 via-amber-50 to-rose-100 text-amber-950 font-bold text-base sm:text-lg shadow-2xl ring-2 ring-amber-300 max-w-[44vw] sm:max-w-xs"
            style={{
              boxShadow:
                "0 0 0 3px rgba(255,224,170,0.4), 0 18px 40px rgba(0,0,0,0.45), inset 0 0 24px rgba(255,235,180,0.6)",
            }}
            aria-label={opt.label}
          >
            <span className="block text-[10px] uppercase tracking-[0.25em] text-amber-700/80 mb-1">
              Choose
            </span>
            <span className="block leading-snug text-balance">{opt.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
