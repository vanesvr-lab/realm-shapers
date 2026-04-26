"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { speakOracle } from "@/lib/oracle-bus";

const TOTAL_DURATION_MS = 5000;
const SKIP_AFTER_MS = 2000;

const SPARKLE_COUNT = 24;

export function CeremonyReveal({
  title,
  onDismiss,
}: {
  title: string;
  onDismiss: () => void;
}) {
  const [canSkip, setCanSkip] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    speakOracle({ text: `Behold... ${title}.`, kind: "ceremony" });
    const skipTimer = setTimeout(() => setCanSkip(true), SKIP_AFTER_MS);
    const dismissTimer = setTimeout(() => setExiting(true), TOTAL_DURATION_MS);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(dismissTimer);
    };
  }, [title]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(onDismiss, 500);
    return () => clearTimeout(t);
  }, [exiting, onDismiss]);

  function trySkip() {
    if (!canSkip) return;
    setExiting(true);
  }

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="ceremony"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={trySkip}
          role="dialog"
          aria-label="Realm reveal"
          className="fixed inset-0 z-[60] cursor-pointer flex items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(60,30,5,0.95) 0%, rgba(20,8,2,1) 75%)",
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: SPARKLE_COUNT }).map((_, i) => {
              const left = (i * 37) % 100;
              const top = (i * 53) % 100;
              const delay = (i % 8) * 0.18;
              const size = 6 + (i % 5) * 3;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.1, 0],
                  }}
                  transition={{
                    duration: 2.4,
                    delay,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: "easeInOut",
                  }}
                  className="absolute rounded-full"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: size,
                    height: size,
                    background:
                      "radial-gradient(circle, rgba(255,235,180,1) 0%, rgba(255,200,100,0.4) 60%, rgba(255,200,100,0) 100%)",
                    boxShadow: "0 0 12px rgba(255,220,140,0.9)",
                  }}
                />
              );
            })}
          </div>

          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="relative px-8 py-12 sm:px-14 sm:py-16 max-w-2xl w-[90%] rounded-3xl"
            style={{
              transformOrigin: "center top",
              background:
                "linear-gradient(180deg, #f7e6c1 0%, #efd49a 50%, #d9b56a 100%)",
              boxShadow:
                "0 30px 60px rgba(0,0,0,0.4), inset 0 0 0 4px rgba(140,90,30,0.4), inset 0 0 60px rgba(255,215,140,0.3)",
            }}
          >
            <div className="absolute -top-3 left-0 right-0 h-3 rounded-t-full bg-gradient-to-b from-amber-900 to-amber-700 shadow" />
            <div className="absolute -bottom-3 left-0 right-0 h-3 rounded-b-full bg-gradient-to-b from-amber-700 to-amber-900 shadow" />

            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-amber-800/80 text-center mb-3">
              The Oracle reveals
            </p>
            <motion.h1
              initial={{ opacity: 0, y: 8, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
              className="text-3xl sm:text-5xl font-extrabold text-center text-balance leading-tight"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: "#5a2b08",
                textShadow:
                  "0 0 18px rgba(255,210,120,0.85), 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              className="text-center text-amber-900/80 mt-6 italic text-base sm:text-lg"
            >
              Your realm awaits.
            </motion.p>
          </motion.div>

          {canSkip && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute bottom-6 text-amber-100/80 text-xs uppercase tracking-widest"
            >
              Tap anywhere to enter
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
