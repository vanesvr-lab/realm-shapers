"use client";
import { useState } from "react";
import type { WorldIngredients, IngredientSlot } from "@/lib/claude";
import { INGREDIENT_SEEDS } from "@/lib/ingredient-seeds";

const MAX_CALLS = 3;

const SLOT_LABELS: Record<IngredientSlot, string> = {
  setting: "Setting",
  character: "Character",
  goal: "Goal",
  twist: "Twist",
};

export function IdeaButton({
  slot,
  current,
  onPick,
}: {
  slot: IngredientSlot;
  current: WorldIngredients;
  onPick: (suggestion: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oracleSuggestions, setOracleSuggestions] = useState<string[]>([]);
  const [callCount, setCallCount] = useState(0);

  const seeds = INGREDIENT_SEEDS[slot];
  const limitReached = callCount >= MAX_CALLS;

  async function fetchOracleIdeas() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, current_values: current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not get ideas");
      } else {
        const fresh: string[] = data.suggestions ?? [];
        setOracleSuggestions((prev) => [...prev, ...fresh]);
        setCallCount((c) => c + 1);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-sm px-2 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 whitespace-nowrap"
      >
        Give me ideas
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">
              Pick a {SLOT_LABELS[slot]}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Tap one to use it, or close and type your own.
            </p>
            <ul className="space-y-2 mb-4">
              {seeds.map((s, i) => (
                <li key={`seed-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(s);
                      close();
                    }}
                    className="w-full text-left p-3 rounded-lg border border-amber-200 hover:bg-amber-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
              {oracleSuggestions.map((s, i) => (
                <li key={`oracle-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(s);
                      close();
                    }}
                    className="w-full text-left p-3 rounded-lg border border-purple-200 bg-purple-50/40 hover:bg-purple-50"
                  >
                    <span className="mr-2">🔮</span>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex flex-wrap gap-2">
              {!limitReached && (
                <button
                  type="button"
                  onClick={fetchOracleIdeas}
                  disabled={loading}
                  className="px-3 py-2 text-sm rounded bg-purple-100 text-purple-900 hover:bg-purple-200 disabled:opacity-60"
                >
                  {loading ? "The Oracle is thinking..." : "🔮 Show me more from the Oracle"}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="ml-auto px-3 py-2 text-sm rounded bg-slate-200"
              >
                I&apos;ll type my own
              </button>
            </div>
            {limitReached && (
              <p className="text-xs text-slate-500 mt-3">
                You&apos;ve used your Oracle boosts for this slot. Pick a seed above or type your own.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
