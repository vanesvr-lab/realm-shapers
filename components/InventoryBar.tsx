"use client";
import Image from "next/image";
import { ASSETS_BY_ID, assetUrlById } from "@/lib/asset-library";

export function InventoryBar({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-black/45 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs sm:text-sm text-amber-100/80">
        <span aria-hidden>🎒</span>
        <span>Pockets are empty.</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg">
      <span className="text-xs uppercase tracking-widest text-amber-100/80 mr-1" aria-hidden>
        🎒
      </span>
      <ul className="flex items-center gap-1.5">
        {items.map((id, idx) => {
          const url = assetUrlById(id);
          const meta = ASSETS_BY_ID[id];
          if (!url || !meta) return null;
          return (
            <li
              key={`${id}-${idx}`}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white/95 ring-2 ring-amber-200 shadow"
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
