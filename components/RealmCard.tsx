"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";
import { resolveBackgroundUrl } from "@/lib/background-resolver";
import type { StoryScene, StoryTree, WorldIngredients } from "@/lib/claude";
import type { EconomySummary } from "@/components/StoryPlayer";
import {
  calculateRarity,
  rarityReason,
  RARITY_BORDER,
  RARITY_LABEL,
  type Rarity,
  type RarityInputs,
} from "@/lib/rarity";
import { getPickup } from "@/lib/pickups-catalog";

const CARD_W = 340;
const CARD_H = 520;

export function RealmCard({
  title,
  story,
  endingScene,
  ingredients,
  rarityInputs,
  username,
  flagTitleSuffix,
  economy,
}: {
  title: string;
  story: StoryTree;
  endingScene: StoryScene;
  ingredients: WorldIngredients;
  rarityInputs: RarityInputs;
  username?: string | null;
  flagTitleSuffix?: string | null;
  economy?: EconomySummary;
}) {
  const displayTitle = flagTitleSuffix ? `${title}, ${flagTitleSuffix}` : title;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const rarity: Rarity = calculateRarity(rarityInputs);
  const reason = rarityReason(rarity, rarityInputs);
  const charUrl = assetUrlById(story.default_character_id);
  const charMeta = ASSETS_BY_ID[story.default_character_id];
  const bgUrl = resolveBackgroundUrl(endingScene.background_id);

  async function downloadPng() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        useCORS: true,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slugify(title)}-card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Card download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={cardRef}
        className={`relative ${rarity === "legendary" ? "animate-prop-glow" : ""}`}
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 22,
          padding: 6,
          background: RARITY_BORDER[rarity],
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: 17,
            background:
              "linear-gradient(180deg, #fff7ea 0%, #f5deb3 50%, #e7c98c 100%)",
          }}
        >
          <header className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.3em] text-amber-800 font-bold"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Realm Shapers
            </span>
            <span
              className="text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full text-white shadow"
              style={{ background: RARITY_BORDER[rarity] }}
            >
              {RARITY_LABEL[rarity]}
            </span>
          </header>

          <h2
            className="px-4 text-center text-2xl font-extrabold text-amber-950 leading-tight text-balance"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {displayTitle}
          </h2>

          <div className="relative mx-4 mt-3 rounded-xl overflow-hidden ring-1 ring-amber-300 shadow-inner" style={{ height: 200 }}>
            {bgUrl && (
              <Image
                src={bgUrl}
                alt={endingScene.title}
                fill
                unoptimized
                sizes="320px"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            {charUrl && charMeta && (
              <div
                className="absolute"
                style={{
                  left: "50%",
                  bottom: "8%",
                  transform: "translateX(-50%)",
                  width: 110,
                  height: 110,
                }}
              >
                <Image
                  src={charUrl}
                  alt={charMeta.alt}
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            )}
          </div>

          <p className="px-4 mt-3 text-xs text-amber-950 italic leading-snug line-clamp-3">
            {endingScene.narration}
          </p>

          <div className="px-4 mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <Ingredient label="Setting" value={ingredients.setting} />
            <Ingredient label="Character" value={ingredients.character} />
            <Ingredient label="Goal" value={ingredients.goal} />
            <Ingredient label="Twist" value={ingredients.twist} />
          </div>

          {economy && (
            <div className="px-4 mt-2 text-[10px] text-amber-950 leading-tight space-y-0.5">
              {economy.endingTier && (
                <div>
                  <span className="uppercase font-bold text-amber-700 tracking-wider">
                    Ending:
                  </span>{" "}
                  <span className="font-semibold">{economy.endingTier}</span>
                </div>
              )}
              <div>
                <span className="uppercase font-bold text-amber-700 tracking-wider">
                  Coins:
                </span>{" "}
                {economy.coinsEarned} earned, {economy.coinsRemaining} remaining
              </div>
              {economy.trophies.length > 0 && (
                <div>
                  <span className="uppercase font-bold text-amber-700 tracking-wider">
                    Trophies:
                  </span>{" "}
                  {economy.trophies
                    .map((id) => getPickup(id)?.label ?? id)
                    .join(", ")}
                </div>
              )}
            </div>
          )}

          <footer className="absolute left-0 right-0 bottom-2 flex items-center justify-between px-4">
            <span className="text-[9px] uppercase tracking-widest text-amber-800/80">
              {username ? `Shaped by ${username}` : "A Realm Shapers card"}
            </span>
            <span className="text-[9px] text-amber-800/70">{new Date().toLocaleDateString()}</span>
          </footer>
        </div>
      </div>

      <p className="text-xs text-amber-950/70 text-center max-w-xs">
        {reason}
      </p>

      <button
        type="button"
        onClick={downloadPng}
        disabled={downloading}
        className="px-4 py-2 rounded-xl bg-amber-700 text-white text-sm font-bold shadow hover:bg-amber-800 disabled:opacity-60"
      >
        {downloading ? "Saving..." : "⬇ Download as PNG"}
      </button>
    </div>
  );
}

function Ingredient({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="uppercase font-bold text-amber-700 tracking-wider">{label}</div>
      <div className="text-amber-950 line-clamp-2">{value}</div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "realm";
}
