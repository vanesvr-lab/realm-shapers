"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BACKGROUNDS,
  CHARACTERS,
  PROPS,
  assetUrl,
  type AssetCategory,
  type AssetDef,
} from "@/lib/asset-library";

export function AssetPalette({
  selectedBackgroundId,
  selectedCharacterId,
  onPickBackground,
  onPickCharacter,
  onAddProp,
}: {
  selectedBackgroundId: string;
  selectedCharacterId: string;
  onPickBackground: (id: string) => void;
  onPickCharacter: (id: string) => void;
  onAddProp: (id: string) => void;
}) {
  const [tab, setTab] = useState<AssetCategory>("props");
  const [query, setQuery] = useState("");

  const list: AssetDef[] = useMemo(() => {
    const base = tab === "backgrounds" ? BACKGROUNDS : tab === "characters" ? CHARACTERS : PROPS;
    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter(
      (a) => a.id.includes(q) || a.alt.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q))
    );
  }, [tab, query]);

  function handleClick(asset: AssetDef) {
    if (asset.category === "backgrounds") onPickBackground(asset.id);
    else if (asset.category === "characters") onPickCharacter(asset.id);
    else onAddProp(asset.id);
  }

  return (
    <aside className="w-full lg:w-80 bg-white/85 rounded-2xl shadow-lg backdrop-blur p-3 flex flex-col gap-3 max-h-[70vh] lg:max-h-[80vh]">
      <div className="flex gap-1">
        <TabButton active={tab === "backgrounds"} onClick={() => setTab("backgrounds")}>
          Scenes
        </TabButton>
        <TabButton active={tab === "characters"} onClick={() => setTab("characters")}>
          Heroes
        </TabButton>
        <TabButton active={tab === "props"} onClick={() => setTab("props")}>
          Props
        </TabButton>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1">
        {list.map((asset) => {
          const isSelected =
            (asset.category === "backgrounds" && asset.id === selectedBackgroundId) ||
            (asset.category === "characters" && asset.id === selectedCharacterId);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleClick(asset)}
              title={asset.alt}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                isSelected
                  ? "border-amber-500 ring-2 ring-amber-300"
                  : "border-transparent hover:border-amber-300"
              }`}
            >
              <Image
                src={assetUrl(asset)}
                alt={asset.alt}
                fill
                unoptimized
                sizes="100px"
                className="object-cover"
              />
            </button>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-3 text-center text-sm text-slate-500 py-6">
            No matches.
          </p>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {tab === "props"
          ? "Tap a prop to drop it on the scene."
          : tab === "characters"
            ? "Tap a hero to swap your character."
            : "Tap a scene to swap the backdrop."}
      </p>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold ${
        active
          ? "bg-amber-700 text-white shadow"
          : "bg-amber-50 text-amber-900 hover:bg-amber-100"
      }`}
    >
      {children}
    </button>
  );
}
