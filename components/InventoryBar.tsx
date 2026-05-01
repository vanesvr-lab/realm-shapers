"use client";
import Image from "next/image";
import { resolvePickupRender } from "@/lib/pickup-resolver";
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
  activeItemId,
  onItemTap,
}: {
  items: string[];
  worldId: string;
  sceneId: string;
  summonsUsed: number;
  summonsMax: number;
  recentlySummonedId: string | null;
  onSummonGranted: (propId: string, alt: string) => void;
  onSummonDenied: () => void;
  // Adventure slice: tap-to-use mechanics. When activeItemId is set, that
  // pickup gets a sparkle ring and StoryPlayer's tryActivate uses that as
  // the kid's "armed" item. Tapping the same item disarms; tapping another
  // arms it. Optional, so non-adventure flows can keep the display-only
  // behavior by omitting both props.
  activeItemId?: string | null;
  onItemTap?: (id: string) => void;
}) {
  const interactive = !!onItemTap;
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
              const rendered = resolvePickupRender(id);
              if (!rendered) return null;
              const isFresh = id === recentlySummonedId;
              const isActive = activeItemId === id;
              const ringClass = isActive
                ? "ring-amber-400 ring-4 animate-summon-sparkle"
                : "ring-amber-200";
              const inner = (
                <>
                  <Image
                    src={rendered.url}
                    alt={rendered.alt}
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
                </>
              );
              if (interactive) {
                return (
                  <li key={`${id}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => onItemTap?.(id)}
                      aria-pressed={isActive}
                      title={rendered.alt}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/95 ring-2 shadow transition ${ringClass} ${
                        isFresh ? "animate-summon-sparkle" : ""
                      } hover:scale-105`}
                    >
                      {inner}
                    </button>
                  </li>
                );
              }
              return (
                <li
                  key={`${id}-${idx}`}
                  className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/95 ring-2 ${ringClass} shadow ${
                    isFresh ? "animate-summon-sparkle" : ""
                  }`}
                  title={rendered.alt}
                >
                  {inner}
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
