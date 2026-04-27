"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";
import { IdeaButton } from "@/components/IdeaButton";
import { StarTapGame } from "@/components/StarTapGame";
import {
  CharacterPicker,
  characterIngredientText,
  type PickerOption,
} from "@/components/CharacterPicker";
import type { IngredientSlot, WorldIngredients } from "@/lib/claude";

const supabase = browserSupabase();

type TextSlot = Exclude<IngredientSlot, "character">;

const TEXT_SLOTS: { key: TextSlot; label: string; placeholder: string; helper: string }[] = [
  {
    key: "setting",
    label: "Setting",
    placeholder: "e.g. an underwater library carved from coral",
    helper: "Where does your story happen?",
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

export function LandingForm() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [setting, setSetting] = useState("");
  const [goal, setGoal] = useState("");
  const [twist, setTwist] = useState("");
  const [pickedCharacter, setPickedCharacter] = useState<PickerOption | null>(null);
  const [heroName, setHeroName] = useState("");
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

  // Build the WorldIngredients-shaped payload used by IdeaButton (so its
  // suggestions can read sibling slot values for context).
  const currentForIdeas: WorldIngredients = {
    setting,
    character: pickedCharacter
      ? characterIngredientText(pickedCharacter, heroName)
      : "",
    goal,
    twist,
  };

  function updateText(key: TextSlot, value: string) {
    if (key === "setting") setSetting(value);
    else if (key === "goal") setGoal(value);
    else setTwist(value);
  }

  const allFilled =
    setting.trim() && pickedCharacter && goal.trim() && twist.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled || loading || !pickedCharacter) return;
    setLoading(true);
    setError(null);
    try {
      const characterText = characterIngredientText(pickedCharacter, heroName);
      const payload: WorldIngredients & { progressive?: boolean } = {
        setting: setting.trim(),
        character: characterText,
        character_asset_id: pickedCharacter.asset_id,
        character_name: heroName.trim() || undefined,
        goal: goal.trim(),
        twist: twist.trim(),
      };
      // B-010 scope 10: opt into progressive (instant placeholder, real
      // tree streams in via /api/finalize) only when the env flag is on.
      // Defaults off so production behavior is unchanged.
      if (process.env.NEXT_PUBLIC_PROGRESSIVE_GEN === "true") {
        payload.progressive = true;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The Oracle could not shape this realm. Try again.");
        setLoading(false);
        return;
      }
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
      {/* Setting (free text + ideas) */}
      <TextField
        slot="setting"
        label={TEXT_SLOTS[0].label}
        placeholder={TEXT_SLOTS[0].placeholder}
        helper={TEXT_SLOTS[0].helper}
        value={setting}
        onChange={(v) => updateText("setting", v)}
        disabled={loading}
        ideaContext={currentForIdeas}
      />

      {/* Character picker (replaces free-text per B-010) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-semibold text-amber-900">Character</label>
          <span className="text-xs text-amber-700/80 italic">Pick a hero, name them if you like</span>
        </div>
        <p className="text-xs text-slate-500 mb-2">Who is the hero of this world?</p>
        <CharacterPicker
          selectedAssetId={pickedCharacter?.asset_id ?? null}
          heroName={heroName}
          onPick={setPickedCharacter}
          onNameChange={setHeroName}
          disabled={loading}
        />
      </div>

      {/* Goal */}
      <TextField
        slot="goal"
        label={TEXT_SLOTS[1].label}
        placeholder={TEXT_SLOTS[1].placeholder}
        helper={TEXT_SLOTS[1].helper}
        value={goal}
        onChange={(v) => updateText("goal", v)}
        disabled={loading}
        ideaContext={currentForIdeas}
      />

      {/* Twist */}
      <TextField
        slot="twist"
        label={TEXT_SLOTS[2].label}
        placeholder={TEXT_SLOTS[2].placeholder}
        helper={TEXT_SLOTS[2].helper}
        value={twist}
        onChange={(v) => updateText("twist", v)}
        disabled={loading}
        ideaContext={currentForIdeas}
      />

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

function TextField({
  slot,
  label,
  placeholder,
  helper,
  value,
  onChange,
  disabled,
  ideaContext,
}: {
  slot: TextSlot;
  label: string;
  placeholder: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ideaContext: WorldIngredients;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={slot} className="block font-semibold text-amber-900">
          {label}
        </label>
        <IdeaButton slot={slot} current={ideaContext} onPick={onChange} />
      </div>
      <p className="text-xs text-slate-500 mb-2">{helper}</p>
      <input
        id={slot}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}
