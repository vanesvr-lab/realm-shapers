"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { AchievementDef } from "@/lib/achievements-types";
import { speakOracle } from "@/lib/oracle-bus";

const DISMISS_AFTER_MS = 4000;

export function AchievementToast({
  queue,
  onConsume,
}: {
  queue: AchievementDef[];
  onConsume: (id: string) => void;
}) {
  const current = queue[0] ?? null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!current) return;
    setVisible(true);
    speakOracle({
      text: `You discovered ${current.name}!`,
      kind: "achievement",
    });
    const dismiss = setTimeout(() => setVisible(false), DISMISS_AFTER_MS);
    const consume = setTimeout(() => onConsume(current.id), DISMISS_AFTER_MS + 350);
    return () => {
      clearTimeout(dismiss);
      clearTimeout(consume);
    };
  }, [current, onConsume]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[55] w-full max-w-md px-4 pointer-events-none">
      <AnimatePresence>
        {current && visible && (
          <motion.div
            key={current.id}
            initial={{ y: -40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={() => setVisible(false)}
            role="status"
            className="relative pointer-events-auto cursor-pointer rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #fff7df 0%, #ffe9b0 50%, #ffcd6e 100%)",
              border: "2px solid rgba(180, 110, 30, 0.5)",
            }}
          >
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <div className="text-3xl sm:text-4xl flex-shrink-0">{current.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">
                  Achievement unlocked
                </p>
                <h3 className="text-base sm:text-lg font-bold text-amber-950 leading-tight truncate">
                  {current.name}
                </h3>
                <p className="text-xs sm:text-sm text-amber-900/80 truncate">
                  {current.description}
                </p>
              </div>
            </div>
            <Sparkles />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sparkles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => {
        const left = (i * 23) % 100;
        const top = (i * 47) % 100;
        const delay = (i % 5) * 0.15;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
            transition={{
              duration: 1.6,
              delay,
              repeat: Infinity,
              repeatDelay: 1.4,
            }}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              background: "radial-gradient(circle, #fffbe6 0%, transparent 70%)",
              boxShadow: "0 0 8px rgba(255,230,140,0.8)",
            }}
          />
        );
      })}
    </div>
  );
}
