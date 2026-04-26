"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { speakOracle } from "@/lib/oracle-bus";

export type SummonResult =
  | { matched: true; prop_id: string; alt: string }
  | { matched: false; suggestion?: string };

export function SummonButton({
  worldId,
  sceneId,
  summonsUsed,
  summonsMax,
  onGranted,
  onDenied,
}: {
  worldId: string;
  sceneId: string;
  summonsUsed: number;
  summonsMax: number;
  onGranted: (propId: string, alt: string) => void;
  onDenied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const exhausted = summonsUsed >= summonsMax;

  useEffect(() => {
    if (open) {
      setText("");
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summon-prop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, world_id: worldId, scene_id: sceneId }),
      });
      const data = (await res.json()) as SummonResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "The Oracle is silent.");
        setLoading(false);
        return;
      }
      if (data.matched) {
        speakOracle({
          text: `Granted! A ${data.alt.toLowerCase()} appears in your pocket.`,
          kind: "discovery",
        });
        onGranted(data.prop_id, data.alt);
        setOpen(false);
      } else {
        const suggestion = data.suggestion;
        speakOracle({
          text: suggestion
            ? `This realm does not yet hold a ${trimmed.toLowerCase()}, but ${suggestion.toLowerCase()} lies somewhere ahead, perhaps.`
            : `This realm does not yet hold a ${trimmed.toLowerCase()}.`,
          kind: "hint",
        });
        onDenied();
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => !exhausted && setOpen(true)}
        disabled={exhausted}
        className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold shadow border-2 transition ${
          exhausted
            ? "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
            : "bg-gradient-to-br from-purple-200 to-fuchsia-200 text-purple-900 border-fuchsia-300 hover:from-purple-100 hover:to-fuchsia-100"
        }`}
        aria-label={exhausted ? "Summons used up" : "Summon something"}
        title={exhausted ? "You have used every summon for this realm." : undefined}
      >
        <span aria-hidden>✨</span>
        <span>Summon</span>
        <span className="text-[10px] opacity-80">
          {summonsUsed}/{summonsMax}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/65 flex items-center justify-center p-4"
            onClick={() => !loading && setOpen(false)}
          >
            <motion.form
              initial={{ y: 20, scale: 0.95, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-amber-50 via-fuchsia-50 to-purple-100 p-6 shadow-2xl border-2 border-fuchsia-200"
            >
              <h2 className="text-xl sm:text-2xl font-extrabold text-purple-950 mb-1">
                ✨ What do you need?
              </h2>
              <p className="text-sm text-purple-900/80 mb-4">
                Tell the Oracle. If this realm holds it, it appears in your pocket.
              </p>
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="a key, a glowing flower, a brave little drum..."
                maxLength={60}
                disabled={loading}
                className="w-full rounded-xl border-2 border-purple-200 bg-white/95 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-fuchsia-400"
              />
              {error && (
                <p className="mt-2 text-sm text-rose-700 font-semibold">{error}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-white/80 text-slate-700 font-semibold hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !text.trim()}
                  className="px-5 py-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white font-bold shadow disabled:opacity-50"
                >
                  {loading ? "Summoning..." : "Summon"}
                </button>
              </div>
              <p className="mt-3 text-[11px] text-purple-900/60">
                Summons left: {Math.max(0, summonsMax - summonsUsed)}
              </p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
