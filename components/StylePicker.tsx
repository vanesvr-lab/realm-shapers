"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { assetUrl, BACKGROUNDS } from "@/lib/asset-library";

const STORAGE_KEY = "realm-shapers:style";
const CURRENT_STYLE = "image2"; // forward-compat stub: only one style ships in v1.

export function StylePicker() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) setOpen(true);
  }, []);

  function pick(style: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, style);
    }
    setOpen(false);
  }

  if (!open) return null;
  const samples = BACKGROUNDS.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">Pick your art style</h2>
        <p className="text-sm text-slate-600 mb-4">
          Right now we only have one style: bright cartoon storybook. More are
          coming soon. Tap to continue.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {samples.map((bg) => (
            <div key={bg.id} className="relative aspect-square rounded-lg overflow-hidden border border-amber-200">
              <Image src={assetUrl(bg)} alt={bg.alt} fill unoptimized sizes="180px" className="object-cover" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => pick(CURRENT_STYLE)}
          className="w-full px-5 py-3 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800"
        >
          Use bright cartoon storybook
        </button>
      </div>
    </div>
  );
}
