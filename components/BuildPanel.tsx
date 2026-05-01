"use client";

// B-019 Skills & Build panel. The kid types a build prompt; a heuristic
// scorer rates it 1-5 based on detail (lib/build-scorer.ts), required
// materials are checked against inventory (lib/builds-catalog.ts), and
// on submit the materials are consumed and a built_<target> pickup with
// a level lands in inventory. Builder XP accumulates the sum of levels
// and surfaces as a tier label (Apprentice / Builder / Master Builder /
// Legendary). All text only this batch (no ElevenLabs, no Claude).

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BUILD_TARGETS,
  BUILD_TARGETS_BY_ID,
  builderTier,
  detectBuildTarget,
} from "@/lib/builds-catalog";
import { scoreBuildPrompt } from "@/lib/build-scorer";
import { getPickup, PICKUPS_BY_ID } from "@/lib/pickups-catalog";

const EXAMPLE_PROMPT =
  "Build me a raft. You are a skilled raft-builder. Use thick wood and tight rope. It must hold three people across a wide river without sinking. Make it light enough to push off the shore.";

export type BuildResult = {
  pickupId: string; // built_<target>
  level: number;
  consumes: string[];
  feedback: string;
};

export function BuildPanel({
  inventory,
  builderXp,
  onClose,
  onBuild,
}: {
  inventory: string[];
  builderXp: number;
  onClose: () => void;
  // The parent applies the result: removes consumes, adds the built
  // pickup with the level recorded, plays a chime, and speaks feedback.
  onBuild: (result: BuildResult) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [showExample, setShowExample] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  // Materials currently on hand. Filtered to the actual material catalog
  // entries so unrelated inventory items do not clutter the display.
  const ownedMaterials = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of inventory) counts.set(id, (counts.get(id) ?? 0) + 1);
    return Array.from(counts.entries())
      .filter(([id]) => PICKUPS_BY_ID[id]?.kind === "material")
      .map(([id, count]) => ({ id, count }));
  }, [inventory]);

  const score = useMemo(() => scoreBuildPrompt(prompt), [prompt]);
  const detectedTarget = useMemo(() => detectBuildTarget(prompt), [prompt]);
  const tier = builderTier(builderXp);

  // Clear any sticky validation message as soon as the kid edits.
  useEffect(() => {
    setSubmitMessage(null);
  }, [prompt]);

  function handleSubmit() {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) {
      setSubmitMessage("Type a few words about what you are building.");
      return;
    }
    const target = detectedTarget;
    if (!target) {
      setSubmitMessage(
        "Tell me what you are building. Try \"build a raft\" or \"build a ladder\"."
      );
      return;
    }
    // Material check.
    const ownedSet = new Set(inventory);
    const missing = target.required_materials.filter((m) => !ownedSet.has(m));
    if (missing.length > 0) {
      const names = missing
        .map((id) => getPickup(id)?.label ?? id)
        .join(", ");
      setSubmitMessage(`Missing materials: ${names}. Visit the Supreme Shop.`);
      return;
    }
    onBuild({
      pickupId: `built_${target.id}`,
      level: score.level,
      consumes: target.required_materials,
      feedback: "", // parent fills via build-scorer.buildFeedbackLine
    });
    setPrompt("");
  }

  return (
    <AnimatePresence>
      <motion.div
        key="build-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Skills and build"
        onClick={onClose}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-amber-100">
              Skills & Build
            </h2>
            <p className="text-xs text-amber-100/80">
              Builder tier:{" "}
              <span className="font-bold text-amber-200">{tier}</span>
              <span className="ml-2 text-amber-100/60">
                ({builderXp} XP)
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close build"
            className="px-3 py-1.5 rounded-lg bg-white/95 text-amber-900 font-semibold text-sm shadow"
          >
            Close
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-900/70 ring-1 ring-amber-200/30 p-3 sm:p-4 flex flex-col gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <section className="bg-white/95 rounded-lg p-3 shadow">
            <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
              Materials on hand
            </div>
            {ownedMaterials.length === 0 ? (
              <p className="text-xs text-slate-700 mt-1">
                Pockets empty. Buy materials at the Supreme Shop first.
              </p>
            ) : (
              <ul className="flex items-center gap-2 flex-wrap mt-2">
                {ownedMaterials.map((m) => {
                  const meta = getPickup(m.id);
                  if (!meta) return null;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-1.5 bg-amber-50 rounded-md px-2 py-1 ring-1 ring-amber-200"
                    >
                      <div className="relative w-6 h-6">
                        <Image
                          src={meta.icon_path}
                          alt={meta.label}
                          fill
                          unoptimized
                          sizes="24px"
                          className="object-contain"
                        />
                      </div>
                      <span className="text-xs font-semibold text-amber-950">
                        {meta.label}
                        {m.count > 1 ? ` ×${m.count}` : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white/95 rounded-lg p-3 shadow">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="build-prompt"
                className="text-[10px] uppercase tracking-widest text-amber-700 font-bold"
              >
                Your build prompt
              </label>
              <button
                type="button"
                onClick={() => setShowExample((s) => !s)}
                aria-label="Show an example prompt"
                className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200"
              >
                {showExample ? "× Hide example" : "? Example"}
              </button>
            </div>
            {showExample && (
              <p className="mt-2 text-xs text-amber-950 italic bg-amber-50 rounded p-2 ring-1 ring-amber-200 leading-snug">
                {EXAMPLE_PROMPT}
              </p>
            )}
            <textarea
              id="build-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Build me a... describe materials, role, constraints, and how it will be used."
              className="mt-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                aria-label={`Current level: ${score.level} of 5`}
                className="px-2 py-1 rounded-full bg-amber-700 text-white text-xs font-bold shadow"
              >
                Level {score.level} / 5
              </span>
              {detectedTarget && (
                <span className="text-xs text-amber-900 bg-amber-100 rounded-full px-2 py-1">
                  Detected: {detectedTarget.label} (needs{" "}
                  {detectedTarget.required_materials
                    .map((id) => getPickup(id)?.label ?? id)
                    .join(", ")}
                  )
                </span>
              )}
            </div>
            <ul className="mt-2 text-xs text-slate-700 space-y-0.5">
              <li>{tickMark(score.hasMaterial)} Names a material</li>
              <li>{tickMark(score.hasRole)} Gives the builder a role</li>
              <li>{tickMark(score.hasConstraint)} Adds a constraint</li>
              <li>{tickMark(score.hasUseCase)} Names a use case</li>
              <li>{tickMark(score.hasSpecifics)} Adds specifics (size, color, number)</li>
            </ul>
            <p className="mt-2 text-[11px] text-slate-600 leading-snug">
              Each detail you add raises the level. Five details = level 5.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white font-bold text-sm shadow hover:bg-amber-800"
              >
                Build
              </button>
              {submitMessage && (
                <span className="text-xs text-rose-700 font-semibold">
                  {submitMessage}
                </span>
              )}
            </div>
          </section>

          <section className="bg-white/95 rounded-lg p-3 shadow">
            <div className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
              Build targets
            </div>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BUILD_TARGETS.map((t) => {
                const builtMeta = getPickup(`built_${t.id}`);
                if (!builtMeta) return null;
                const ownedSet = new Set(inventory);
                const missing = t.required_materials.filter(
                  (m) => !ownedSet.has(m)
                );
                const ready = missing.length === 0;
                return (
                  <li
                    key={t.id}
                    className={`rounded-md p-2 ring-1 flex items-center gap-2 ${
                      ready
                        ? "bg-emerald-50 ring-emerald-200"
                        : "bg-slate-50 ring-slate-200"
                    }`}
                  >
                    <div className="relative w-8 h-8 shrink-0">
                      <Image
                        src={builtMeta.icon_path}
                        alt={builtMeta.label}
                        fill
                        unoptimized
                        sizes="32px"
                        className="object-contain"
                      />
                    </div>
                    <div className="text-xs leading-tight">
                      <div className="font-bold text-amber-950">
                        {capitalize(t.label)}
                      </div>
                      <div className="text-slate-600">
                        {t.required_materials
                          .map((id) => getPickup(id)?.label ?? id)
                          .join(" + ")}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function tickMark(on: boolean): string {
  return on ? "✓" : "•";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Re-export the lookup so StoryPlayer can find a target's display label
// when speaking the level-tuned feedback line.
export { BUILD_TARGETS_BY_ID };
