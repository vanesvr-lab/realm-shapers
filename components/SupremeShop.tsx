"use client";

// B-019 supreme shop. Modal listing every catalog pickup with a
// purchase_price. Buy decrements coins, adds the material to inventory,
// and plays the existing coin chime via the parent. Per-scene markets
// (river fisher, cave hermit) are unaffected and still live on their
// own scenes; this is a separate global entry from the left rail.

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SHOP_MATERIALS } from "@/lib/pickups-catalog";

export function SupremeShop({
  coins,
  onClose,
  onBuy,
}: {
  coins: number;
  onClose: () => void;
  onBuy: (pickupId: string, price: number) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        key="shop-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Supreme shop"
        onClick={onClose}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-amber-100">
            Supreme Shop
          </h2>
          <div className="flex items-center gap-3">
            <span
              className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-sm font-bold shadow"
              aria-label={`Coins: ${coins}`}
            >
              Coins: {coins}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close shop"
              className="px-3 py-1.5 rounded-lg bg-white/95 text-amber-900 font-semibold text-sm shadow"
            >
              Close
            </button>
          </div>
        </div>
        <div
          className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-900/70 ring-1 ring-amber-200/30 p-3 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHOP_MATERIALS.map((p) => {
              const price = p.purchase_price ?? 0;
              const canAfford = coins >= price;
              const shortBy = price - coins;
              return (
                <li
                  key={p.id}
                  className="bg-white/95 rounded-lg p-3 shadow flex items-center gap-3"
                >
                  <div className="relative w-14 h-14 rounded-md bg-amber-50 ring-1 ring-amber-200 shrink-0">
                    <Image
                      src={p.icon_path}
                      alt={p.label}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-amber-950 text-sm">
                      {p.label}
                    </div>
                    <p className="text-xs text-slate-700 leading-snug line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canAfford) return;
                      onBuy(p.id, price);
                    }}
                    disabled={!canAfford}
                    aria-label={
                      canAfford
                        ? `Buy ${p.label} for ${price} coins`
                        : `Need ${shortBy} more coins for ${p.label}`
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-bold shadow ${
                      canAfford
                        ? "bg-amber-700 text-white hover:bg-amber-800"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {canAfford ? `Buy ${price}` : `Need ${shortBy}`}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="text-xs text-amber-100/80 mt-3 text-center">
          Materials feed the Skills & Build panel. Food and water refill the road.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
