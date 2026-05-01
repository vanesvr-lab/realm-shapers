"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";
import { IdeaButton } from "@/components/IdeaButton";
import { StarTapGame } from "@/components/StarTapGame";
import {
  THEMES,
  THEMES_BY_ID,
  type Theme,
  type SubScene,
} from "@/lib/themes-catalog";
import { CHARACTERS, type Character } from "@/lib/characters-catalog";
import { matchSubScene } from "@/lib/scene-matcher";
import type { IngredientSlot, WorldIngredients } from "@/lib/claude";

const supabase = browserSupabase();

// B-011 landing form. Step-by-step disclosure: theme → setting →
// character → goal → twist → prompt preview → Summon. The 4-ingredient
// model from B-002b is preserved (setting/character/goal/twist) but
// setting and character are now picker-driven via the catalogs in
// lib/themes-catalog.ts and lib/characters-catalog.ts. Free-text setting
// is reused as a narrowing fallback for the sub-scene grid via the
// scene-matcher.

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function LandingForm() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [themeId, setThemeId] = useState<string | null>(null);
  const [entrySubSceneId, setEntrySubSceneId] = useState<string | null>(null);
  const [typedSetting, setTypedSetting] = useState("");
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [heroName, setHeroName] = useState("");
  const [goal, setGoal] = useState("");
  const [twist, setTwist] = useState("");

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

  const theme = themeId ? THEMES_BY_ID[themeId] ?? null : null;
  const subScenes = theme?.sub_scenes ?? [];
  const character = characterId
    ? CHARACTERS.find((c) => c.id === characterId) ?? null
    : null;
  const entrySubScene = entrySubSceneId
    ? subScenes.find((s) => s.id === entrySubSceneId) ?? null
    : null;

  // When the kid types into the free-text fallback, narrow to the closest
  // sub-scene within the picked theme. Auto-select on a confident match;
  // otherwise leave the previous picker selection alone.
  useEffect(() => {
    if (!theme || !typedSetting.trim()) return;
    const match = matchSubScene(typedSetting, theme.sub_scenes);
    if (match) setEntrySubSceneId(match.id);
  }, [typedSetting, theme]);

  // Reset downstream state when an earlier step changes.
  function pickTheme(id: string) {
    if (id === themeId) return;
    setThemeId(id);
    setEntrySubSceneId(null);
    setTypedSetting("");
    setCharacterId(null);
  }

  function pickEntrySubScene(id: string) {
    setEntrySubSceneId(id);
  }

  function pickCharacter(id: string) {
    setCharacterId(id);
  }

  // Step gating: each step is "filled" when its required field is present.
  // The form reveals one step at a time as the kid completes each.
  const step1Done = !!themeId;
  const step2Done = step1Done && !!entrySubSceneId;
  const step3Done = step2Done && !!characterId;
  const step4Done = step3Done && goal.trim().length > 0;
  const step5Done = step4Done && twist.trim().length > 0;
  const step6Visible = step5Done;
  // Adventure slice: castle theme routes to the hand-authored adventure,
  // which doesn't ask for goal / twist. Skip steps 4-6 entirely and let
  // the kid submit right after step 3.
  const isAdventureFlow = theme?.id === "castle";
  const submitVisible = isAdventureFlow ? step3Done : step6Visible;

  // For IdeaButton context: feed the 4-ingredient picture so suggestions
  // for goal / twist consider the theme + character context.
  const ingredientsForIdeas: WorldIngredients = useMemo(
    () => ({
      setting: entrySubScene
        ? `${entrySubScene.label} in the ${theme?.label ?? ""} world`
        : "",
      character: character
        ? heroName.trim()
          ? `${heroName.trim()}, the ${character.label.toLowerCase()}`
          : character.label.toLowerCase()
        : "",
      goal,
      twist,
    }),
    [entrySubScene, theme, character, heroName, goal, twist]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submitVisible || loading) return;
    if (!theme || !entrySubScene || !character) return;
    setLoading(true);
    setError(null);
    try {
      // Adventure slice: when the kid picks the Castle theme, route into the
      // hand-authored Hunt the Dragon's Egg adventure instead of the Claude
      // generation flow. The form fields are still required up to step 3
      // (theme, sub-scene, character) so the kid sees the same picking
      // experience; we just discard the goal/twist text and substitute the
      // adventure tree on submit.
      const payload: Record<string, unknown> =
        theme.id === "castle"
          ? { adventure_id: "hunt-dragon-egg" }
          : {
              theme: theme.id,
              entry_sub_scene_id: entrySubScene.id,
              character_id: character.id,
              character_name: heroName.trim() || undefined,
              goal: goal.trim(),
              twist: twist.trim(),
            };
      if (theme.id !== "castle" && process.env.NEXT_PUBLIC_PROGRESSIVE_GEN === "true") {
        payload.progressive = true;
      }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ??
            "The Oracle could not shape this realm right now. Please pick a new realm and try again."
        );
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step 1: Theme */}
      <Step
        number={1}
        title="Pick a world"
        helper="What kind of place is your story in?"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={t.id === themeId}
              disabled={loading}
              onPick={() => pickTheme(t.id)}
            />
          ))}
        </div>
      </Step>

      {/* Step 2: Setting (sub-scene picker + free text) */}
      {step1Done && theme && (
        <Step
          number={2}
          title="Where do you start?"
          helper="Pick a place inside the world, or describe one in your own words."
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {subScenes.map((sub) => (
              <SubSceneCard
                key={sub.id}
                sub={sub}
                selected={sub.id === entrySubSceneId}
                disabled={loading}
                onPick={() => pickEntrySubScene(sub.id)}
              />
            ))}
          </div>
          <div className="mt-3">
            <label
              htmlFor="setting_freetext"
              className="block text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1"
            >
              Or describe a different starting place
            </label>
            <input
              id="setting_freetext"
              type="text"
              value={typedSetting}
              onChange={(e) => setTypedSetting(e.target.value)}
              placeholder={`e.g. a hidden ${theme.label.toLowerCase()} room`}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            />
            {typedSetting.trim() && entrySubScene && (
              <p className="mt-1 text-xs text-amber-800">
                Closest spot in the {theme.label} world: <strong>{entrySubScene.label}</strong>
              </p>
            )}
          </div>
        </Step>
      )}

      {/* Step 3: Character */}
      {step2Done && theme && (
        <Step
          number={3}
          title="Pick your hero"
          helper={`Who is the hero in your ${theme.label} story?`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {CHARACTERS.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                themeId={theme.id}
                selected={c.id === characterId}
                disabled={loading}
                onPick={() => pickCharacter(c.id)}
              />
            ))}
          </div>
          <div className="mt-3">
            <label
              htmlFor="hero_name"
              className="block text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1"
            >
              Name your hero (optional)
            </label>
            <input
              id="hero_name"
              type="text"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="e.g. Elara, Captain Mo, Sparky"
              disabled={loading}
              maxLength={28}
              className="w-full px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
            />
          </div>
        </Step>
      )}

      {/* Step 4: Goal */}
      {step3Done && !isAdventureFlow && (
        <Step
          number={4}
          title="What is the goal?"
          helper="What does your hero want to do?"
        >
          <TextRow
            id="goal"
            slot="goal"
            value={goal}
            onChange={setGoal}
            placeholder="e.g. find the dragon's lost egg"
            disabled={loading}
            ideaContext={ingredientsForIdeas}
          />
        </Step>
      )}

      {/* Step 5: Twist */}
      {step4Done && !isAdventureFlow && (
        <Step
          number={5}
          title="What is the twist?"
          helper="A surprise that makes it weird."
        >
          <TextRow
            id="twist"
            slot="twist"
            value={twist}
            onChange={setTwist}
            placeholder="e.g. the dragon is shy"
            disabled={loading}
            ideaContext={ingredientsForIdeas}
          />
        </Step>
      )}

      {/* Step 6: Prompt preview */}
      {step6Visible && !isAdventureFlow && theme && entrySubScene && character && (
        <Step
          number={6}
          title="Your prompt"
          helper="This is what you are asking the Oracle to make."
        >
          <PromptPreview
            theme={theme}
            entrySubScene={entrySubScene}
            character={character}
            heroName={heroName}
            goal={goal}
            twist={twist}
          />
        </Step>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {submitVisible && (
        <button
          type="submit"
          disabled={!authReady || loading}
          className="w-full px-5 py-4 rounded-xl bg-amber-700 text-white font-bold text-lg shadow hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Shaping your realm..."
            : !authReady
            ? "Getting ready..."
            : isAdventureFlow
            ? "Begin the Adventure"
            : "Summon Realm"}
        </button>
      )}

      {loading && (
        <div className="space-y-3">
          <p className="text-sm text-center text-slate-600">
            The Oracle is weaving your realm. This usually takes about 15 seconds.
          </p>
          <StarTapGame />
        </div>
      )}
    </form>
  );
}

function Step({
  number,
  title,
  helper,
  children,
}: {
  number: Step;
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
          Step {number}
        </span>
        <h2 className="font-bold text-amber-900 text-lg">{title}</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">{helper}</p>
      {children}
    </section>
  );
}

function ThemeCard({
  theme,
  selected,
  disabled,
  onPick,
}: {
  theme: Theme;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={theme.label}
      className={`group relative aspect-[5/3] rounded-xl overflow-hidden border-2 text-left transition focus:outline-none ${
        selected
          ? "border-amber-500 ring-2 ring-amber-300 shadow-md"
          : "border-amber-200 hover:border-amber-400"
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <Image
        src={theme.thumbnail_path}
        alt={theme.label}
        fill
        unoptimized
        sizes="240px"
        className="object-cover bg-amber-50"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-2 text-white">
        <span className="block text-sm font-bold leading-tight">{theme.label}</span>
        <span className="block text-[11px] opacity-90 leading-tight">{theme.description}</span>
      </span>
      {selected && (
        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
          picked
        </span>
      )}
    </button>
  );
}

function SubSceneCard({
  sub,
  selected,
  disabled,
  onPick,
}: {
  sub: SubScene;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={sub.label}
      className={`group relative aspect-[5/3] rounded-lg overflow-hidden border-2 text-left transition focus:outline-none ${
        selected
          ? "border-amber-500 ring-2 ring-amber-300 shadow-md"
          : "border-amber-200 hover:border-amber-400"
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <Image
        src={sub.file_path}
        alt={sub.label}
        fill
        unoptimized
        sizes="200px"
        className="object-cover bg-amber-50"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-1.5 text-white">
        <span className="block text-[12px] font-bold leading-tight">{sub.label}</span>
      </span>
      {sub.can_be_entry && (
        <span className="absolute top-1 left-1 bg-emerald-500/90 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow">
          great start
        </span>
      )}
      {selected && (
        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow">
          picked
        </span>
      )}
    </button>
  );
}

function CharacterCard({
  character,
  themeId,
  selected,
  disabled,
  onPick,
}: {
  character: Character;
  themeId: string;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  const fits = character.theme_fit.includes(themeId);
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={character.label}
      className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition focus:outline-none ${
        selected
          ? "border-amber-500 ring-2 ring-amber-300 shadow-md"
          : fits
          ? "border-emerald-300 hover:border-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]"
          : "border-amber-200 hover:border-amber-400"
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <Image
        src={character.thumbnail_path}
        alt={character.label}
        fill
        unoptimized
        sizes="160px"
        className="object-cover bg-amber-50"
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent text-white text-[11px] sm:text-xs font-semibold py-1 px-1.5 text-center leading-tight">
        {character.label}
      </span>
      {fits && !selected && (
        <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow">
          great match
        </span>
      )}
      {selected && (
        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
          picked
        </span>
      )}
    </button>
  );
}

function TextRow({
  id,
  slot,
  value,
  onChange,
  placeholder,
  disabled,
  ideaContext,
}: {
  id: string;
  slot: IngredientSlot;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled: boolean;
  ideaContext: WorldIngredients;
}) {
  return (
    <div>
      <div className="flex items-center justify-end mb-1">
        <IdeaButton slot={slot} current={ideaContext} onPick={onChange} />
      </div>
      <input
        id={id}
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

function PromptPreview({
  theme,
  entrySubScene,
  character,
  heroName,
  goal,
  twist,
}: {
  theme: Theme;
  entrySubScene: SubScene;
  character: Character;
  heroName: string;
  goal: string;
  twist: string;
}) {
  const heroLabel = character.label.toLowerCase();
  const heroPart = heroName.trim()
    ? (
        <>
          starring my <strong>{heroLabel}</strong> named <strong>{heroName.trim()}</strong>
        </>
      )
    : (
        <>
          starring my <strong>{heroLabel}</strong>
        </>
      );
  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/70 p-4 leading-relaxed text-amber-950">
      <p className="text-sm">
        Create my realm in the <strong>{theme.label}</strong> world, starting at the{" "}
        <strong>{entrySubScene.label.toLowerCase()}</strong>, {heroPart}. My goal is to{" "}
        <strong>{goal.trim()}</strong>. The twist is <strong>{twist.trim()}</strong>.
      </p>
    </div>
  );
}
