"use client";

// B-019: vertical button rail anchored to the left side of the play
// viewport. Replaces the standalone Map button (B-018) and hosts the new
// Hints, Supreme Shop, and Skills & Build entry points. Buttons are
// fixed-position so they sit above pickups and narration without
// blocking either. Tap targets are at least 44px so they pass the
// kid-friendly touch standard.

type RailButton = {
  id: string;
  emoji: string;
  label: string;
  onClick: () => void;
  badge?: string | number;
};

export function LeftRail({
  onOpenMap,
  onOpenHints,
  onOpenShop,
  onOpenBuild,
  hintsCount,
  builderTier,
}: {
  onOpenMap: () => void;
  onOpenHints: () => void;
  onOpenShop: () => void;
  onOpenBuild: () => void;
  hintsCount: number;
  builderTier: string;
}) {
  const buttons: RailButton[] = [
    { id: "map", emoji: "🗺️", label: "Map", onClick: onOpenMap },
    {
      id: "hints",
      emoji: "💡",
      label: "Hints",
      onClick: onOpenHints,
      badge: hintsCount > 0 ? hintsCount : undefined,
    },
    { id: "shop", emoji: "🛒", label: "Shop", onClick: onOpenShop },
    {
      id: "build",
      emoji: "🔨",
      label: "Build",
      onClick: onOpenBuild,
      badge: builderTier,
    },
  ];

  return (
    <nav
      aria-label="Realm tools"
      className="fixed left-3 bottom-3 z-30 flex flex-col gap-2 items-stretch"
    >
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={b.onClick}
          aria-label={`Open ${b.label}`}
          className="relative min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-white/95 text-amber-900 font-semibold text-sm shadow flex items-center gap-1.5 hover:bg-white"
        >
          <span aria-hidden>{b.emoji}</span>
          <span>{b.label}</span>
          {b.badge !== undefined && (
            <span
              aria-hidden
              className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-bold leading-none"
            >
              {b.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
