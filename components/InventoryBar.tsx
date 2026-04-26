"use client";
import Image from "next/image";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";
import { SummonButton } from "@/components/SummonButton";

export function InventoryBar({
  items,
  worldId,
  sceneId,
  summonsUsed,
  summonsMax,
  recentlySummonedId,
  onSummonGranted,
  onSummonDenied,
}: {
  items: string[];
  worldId: string;
  sceneId: string;
  summonsUsed: number;
  summonsMax: number;
  recentlySummonedId: string | null;
  onSummonGranted: (propId: string, alt: string) => void;
  onSummonDenied: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div
        className={`flex items-center gap-2 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg ${
          items.length === 0 ? "bg-black/45" : "bg-black/55"
        }`}
      >
        <span className="text-xs uppercase tracking-widest text-amber-100/80 mr-1" aria-hidden>
          🎒
        </span>
        {items.length === 0 ? (
          <span className="text-xs sm:text-sm text-amber-100/80">Pockets are empty.</span>
        ) : (
          <ul className="flex items-center gap-1.5">
            {items.map((id, idx) => {
              const url = assetUrlById(id);
              const meta = ASSETS_BY_ID[id];
              if (!url || !meta) return null;
              const isFresh = id === recentlySummonedId;
              return (
                <li
                  key={`${id}-${idx}`}
                  className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/95 ring-2 ring-amber-200 shadow ${
                    isFresh ? "animate-summon-sparkle" : ""
                  }`}
                  title={meta.alt}
                >
                  <Image
                    src={url}
                    alt={meta.alt}
                    fill
                    unoptimized
                    sizes="44px"
                    className="object-contain p-1"
                  />
                  {isFresh && (
                    <span
                      aria-hidden
                      className="absolute -top-2 -right-2 text-base animate-summon-sparkle"
                    >
                      ✨
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SummonButton
        worldId={worldId}
        sceneId={sceneId}
        summonsUsed={summonsUsed}
        summonsMax={summonsMax}
        onGranted={onSummonGranted}
        onDenied={onSummonDenied}
      />
    </div>
  );
}
