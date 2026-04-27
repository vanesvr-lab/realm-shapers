"use client";
import Image from "next/image";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";

// B-010 character picker. Replaces the free-text "Character" field on the
// landing form so the kid can only choose heroes we have assets for. Locks
// the rendered hero in play to the picker selection (no silent fallback to
// hero_girl). Required ratio per brief: at least 1 girl-coded + 1 boy-coded.
// The other 6 are CLI's pick from existing assets, mixing creatures, kids,
// and other vibes so every kid can find someone to play.

export type PickerOption = {
  asset_id: string;
  label: string;
  // Used downstream by Claude when picking the hero voice (Fena vs Ryan).
  gender_coded: "girl" | "boy" | "neutral";
};

export const CHARACTER_PICKER_OPTIONS: PickerOption[] = [
  { asset_id: "hero_girl", label: "Brave hero (girl)", gender_coded: "girl" },
  { asset_id: "hero_boy", label: "Brave hero (boy)", gender_coded: "boy" },
  { asset_id: "dragon", label: "Purple dragon", gender_coded: "neutral" },
  { asset_id: "wizard", label: "Young wizard", gender_coded: "boy" },
  { asset_id: "fairy", label: "Sparkly fairy", gender_coded: "girl" },
  { asset_id: "robot", label: "Friendly robot", gender_coded: "neutral" },
  { asset_id: "astronaut", label: "Astronaut", gender_coded: "neutral" },
  { asset_id: "fox", label: "Clever fox", gender_coded: "neutral" },
];

export function genderCodingFor(assetId: string): "girl" | "boy" | "neutral" {
  return CHARACTER_PICKER_OPTIONS.find((o) => o.asset_id === assetId)?.gender_coded ?? "neutral";
}

// Compose the human-readable text version of the character ingredient that
// flows into Claude's prompt and into the Realm Card. Examples:
// - name="Elara", label="Brave hero (girl)" → "Elara, the brave hero girl"
// - name="",      label="Purple dragon"     → "a purple dragon"
export function characterIngredientText(option: PickerOption, name: string): string {
  const trimmed = name.trim();
  const baseAlt = ASSETS_BY_ID[option.asset_id]?.alt ?? option.label;
  const altLower = baseAlt.toLowerCase();
  if (trimmed) {
    return `${trimmed}, the ${altLower}`;
  }
  return /^[aeiou]/.test(altLower) ? `an ${altLower}` : `a ${altLower}`;
}

export function CharacterPicker({
  selectedAssetId,
  heroName,
  onPick,
  onNameChange,
  disabled,
}: {
  selectedAssetId: string | null;
  heroName: string;
  onPick: (option: PickerOption) => void;
  onNameChange: (name: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {CHARACTER_PICKER_OPTIONS.map((option) => {
          const url = assetUrlById(option.asset_id);
          const meta = ASSETS_BY_ID[option.asset_id];
          const isSelected = option.asset_id === selectedAssetId;
          return (
            <button
              key={option.asset_id}
              type="button"
              onClick={() => onPick(option)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={option.label}
              className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition focus:outline-none ${
                isSelected
                  ? "border-amber-500 ring-2 ring-amber-300 shadow-md"
                  : "border-amber-200 hover:border-amber-400"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {url && meta && (
                <Image
                  src={url}
                  alt={meta.alt}
                  fill
                  unoptimized
                  sizes="160px"
                  className="object-cover bg-amber-50"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent text-white text-[11px] sm:text-xs font-semibold py-1 px-1.5 text-center leading-tight">
                {option.label}
              </span>
              {isSelected && (
                <span className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
                  picked
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
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
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Elara, Captain Mo, Sparky"
          disabled={disabled}
          maxLength={28}
          className="w-full px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
        />
      </div>
    </div>
  );
}
