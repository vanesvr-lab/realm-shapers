"use client";
import Image from "next/image";
import { useState } from "react";
import { resolvePickupRender } from "@/lib/pickup-resolver";
import { getPickup } from "@/lib/pickups-catalog";

// Adventure slice: pre-game pocket pick. Renders the candidate items as
// toggle cards. Confirm enables only when exactly requiredCount items are
// selected. On confirm, calls onConfirm with the picked ids; PlayClient
// uses that as initialInventory for StoryPlayer.

export function StarterPicker({
  candidates,
  requiredCount,
  onConfirm,
}: {
  candidates: string[];
  requiredCount: number;
  onConfirm: (picked: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const isPicked = (id: string) => picked.includes(id);
  const canConfirm = picked.length === requiredCount;

  function toggle(id: string) {
    if (isPicked(id)) {
      setPicked(picked.filter((p) => p !== id));
    } else if (picked.length < requiredCount) {
      setPicked([...picked, id]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 mb-8 sm:mb-0 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-2xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-widest text-amber-700 mb-1">The Oracle</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
          Choose {requiredCount} to bring
        </h2>
        <p className="text-sm text-slate-600 mb-5">
          The road is long. Pick carefully. You can leave the rest behind.
        </p>

        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {candidates.map((id) => {
            const rendered = resolvePickupRender(id);
            const pickup = getPickup(id);
            if (!rendered || !pickup) return null;
            const selected = isPicked(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={selected}
                  className={`w-full flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition shadow-sm ${
                    selected
                      ? "bg-amber-100 border-amber-500 shadow-md scale-[1.02]"
                      : "bg-white border-amber-200 hover:border-amber-400 hover:bg-amber-50"
                  }`}
                >
                  <span className="relative w-14 h-14 sm:w-16 sm:h-16">
                    <Image
                      src={rendered.url}
                      alt={rendered.alt}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-contain"
                    />
                  </span>
                  <span className="text-sm font-semibold text-slate-800 text-center leading-tight">
                    {pickup.label}
                  </span>
                  {selected && (
                    <span className="text-xs text-amber-700 font-bold">PICKED</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">
            <strong>{picked.length}</strong> of {requiredCount} chosen
          </span>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            disabled={!canConfirm}
            className="px-5 py-2.5 rounded-xl bg-amber-700 text-white font-bold shadow hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
