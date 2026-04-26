"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";
import { IdeaButton } from "@/components/IdeaButton";
import { StarTapGame } from "@/components/StarTapGame";
import type { IngredientSlot, WorldIngredients } from "@/lib/claude";

const supabase = browserSupabase();

const SLOTS: { key: IngredientSlot; label: string; placeholder: string; helper: string }[] = [
  {
    key: "setting",
    label: "Setting",
    placeholder: "e.g. an underwater library carved from coral",
    helper: "Where does your story happen?",
  },
  {
    key: "character",
    label: "Character",
    placeholder: "e.g. a forgetful octopus librarian",
    helper: "Who is the hero of this world?",
  },
  {
    key: "goal",
    label: "Goal",
    placeholder: "e.g. find the stolen Book of Tides",
    helper: "What do they want to do?",
  },
  {
    key: "twist",
    label: "Twist",
    placeholder: "e.g. the thief is her own shadow",
    helper: "Add a surprise that makes it weird.",
  },
];

const EMPTY: WorldIngredients = { setting: "", character: "", goal: "", twist: "" };

export function LandingForm() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [values, setValues] = useState<WorldIngredients>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (!cancelled) setAuthError(error.message);
        return;
      }
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          if (!cancelled) setAuthError(signInError.message);
          return;
        }
      }
      if (!cancelled) setAuthReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key: IngredientSlot, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const allFilled =
    values.setting.trim() && values.character.trim() && values.goal.trim() && values.twist.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The Oracle could not shape this realm. Try again.");
        setLoading(false);
        return;
      }
      // Stash any unlocked achievements so PlayClient can show them once it mounts.
      try {
        if (Array.isArray(data.unlocked) && data.unlocked.length > 0) {
          sessionStorage.setItem(
            "realm-shapers:pending-unlocks",
            JSON.stringify(data.unlocked)
          );
        }
      } catch {
        // ignore
      }
      router.push(`/play?world=${data.id}&ceremony=1`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  if (authError) {
    return <p className="text-red-600">Could not start your session: {authError}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {SLOTS.map((slot) => (
        <div key={slot.key}>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={slot.key} className="block font-semibold text-amber-900">
              {slot.label}
            </label>
            <IdeaButton slot={slot.key} current={values} onPick={(s) => update(slot.key, s)} />
          </div>
          <p className="text-xs text-slate-500 mb-2">{slot.helper}</p>
          <input
            id={slot.key}
            type="text"
            value={values[slot.key]}
            onChange={(e) => update(slot.key, e.target.value)}
            placeholder={slot.placeholder}
            disabled={loading}
            className="w-full px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={!authReady || !allFilled || loading}
        className="w-full px-5 py-4 rounded-xl bg-amber-700 text-white font-bold text-lg shadow hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Shaping your realm..." : authReady ? "Shape my realm" : "Getting ready..."}
      </button>
      {loading && (
        <div className="space-y-3">
          <p className="text-sm text-center text-slate-600">
            The Oracle is weaving 8 to 10 scenes with side quests. This usually takes about 15 seconds.
          </p>
          <StarTapGame />
        </div>
      )}
    </form>
  );
}
