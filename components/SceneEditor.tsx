"use client";
import { useEffect, useState } from "react";
import type { StoryTree } from "@/lib/claude";
import { ASSETS_BY_ID } from "@/lib/asset-library";
import { AssetPalette } from "@/components/AssetPalette";
import { SceneCanvas } from "@/components/SceneCanvas";
import type { PlacedProp } from "@/components/PropOverlay";
import type { PlacedBubble } from "@/components/TextBubble";

export type EditorSnapshot = {
  propsPlaced: number;
  characterId: string;
  backgroundId: string;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

const DEFAULT_CHAR_POS = {
  x: CANVAS_WIDTH / 2 - 90,
  y: CANVAS_HEIGHT - 220,
  width: 180,
  height: 180,
};

let nextUid = 0;
function makeUid(prefix: string) {
  nextUid += 1;
  return `${prefix}_${Date.now().toString(36)}_${nextUid}`;
}

export function SceneEditor({
  worldId,
  story,
  initialNarration,
  onPlay,
  onSnapshotChange,
}: {
  worldId: string;
  story: StoryTree;
  initialNarration: string;
  onPlay: (snapshot: EditorSnapshot) => void;
  onSnapshotChange?: (snapshot: EditorSnapshot) => void;
}) {
  const startingScene = story.scenes.find((s) => s.id === story.starting_scene_id) ?? story.scenes[0];

  const [characterId, setCharacterId] = useState<string>(story.default_character_id);
  const [backgroundId, setBackgroundId] = useState<string>(startingScene.background_id);
  const [characterPos, setCharacterPos] = useState(DEFAULT_CHAR_POS);
  const [props, setProps] = useState<PlacedProp[]>(() =>
    startingScene.default_props.map((id, i) => ({
      uid: makeUid("prop"),
      asset_id: id,
      x: 80 + i * 220,
      y: CANVAS_HEIGHT - 180,
      width: 130,
      height: 130,
      z: 1 + i,
    }))
  );
  const [bubbles, setBubbles] = useState<PlacedBubble[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [narration, setNarration] = useState(initialNarration);
  const [rewriteState, setRewriteState] = useState<{ loading: boolean; remaining: number | null; error: string | null }>(
    { loading: false, remaining: null, error: null }
  );

  function addProp(assetId: string) {
    const asset = ASSETS_BY_ID[assetId];
    if (!asset || asset.category !== "props") return;
    const z = props.length + bubbles.length + 2;
    const newProp: PlacedProp = {
      uid: makeUid("prop"),
      asset_id: assetId,
      x: CANVAS_WIDTH / 2 - 60,
      y: CANVAS_HEIGHT / 2 - 60,
      width: 130,
      height: 130,
      z,
    };
    setProps((p) => [...p, newProp]);
    setSelectedUid(newProp.uid);
  }

  function addBubble() {
    const z = props.length + bubbles.length + 2;
    const newBubble: PlacedBubble = {
      uid: makeUid("bubble"),
      text: "",
      x: 60,
      y: 60,
      width: 220,
      height: 80,
      z,
    };
    setBubbles((b) => [...b, newBubble]);
    setSelectedUid(newBubble.uid);
  }

  function bringForward(uid: string) {
    const maxZ = Math.max(0, ...props.map((p) => p.z), ...bubbles.map((b) => b.z));
    setProps((arr) => arr.map((p) => (p.uid === uid ? { ...p, z: maxZ + 1 } : p)));
    setBubbles((arr) => arr.map((b) => (b.uid === uid ? { ...b, z: maxZ + 1 } : b)));
  }

  function sendBackward(uid: string) {
    const minZ = Math.min(0, ...props.map((p) => p.z), ...bubbles.map((b) => b.z));
    setProps((arr) => arr.map((p) => (p.uid === uid ? { ...p, z: minZ - 1 } : p)));
    setBubbles((arr) => arr.map((b) => (b.uid === uid ? { ...b, z: minZ - 1 } : b)));
  }

  useEffect(() => {
    onSnapshotChange?.({
      propsPlaced: props.length,
      characterId,
      backgroundId,
    });
  }, [props.length, characterId, backgroundId, onSnapshotChange]);

  async function reNarrate() {
    setRewriteState({ loading: true, remaining: rewriteState.remaining, error: null });
    try {
      const res = await fetch("/api/scene/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          world_id: worldId,
          scene_id: startingScene.id,
          character_id: characterId,
          prop_ids: props.map((p) => p.asset_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRewriteState({ loading: false, remaining: rewriteState.remaining, error: data.error ?? "rewrite failed" });
        return;
      }
      setNarration(data.narration);
      setRewriteState({ loading: false, remaining: data.remaining ?? null, error: null });
    } catch (err) {
      setRewriteState({ loading: false, remaining: rewriteState.remaining, error: String(err) });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
      <div className="flex flex-col gap-3">
        <div className="bg-white/85 rounded-2xl shadow-lg p-3 sm:p-4">
          <div
            style={{
              width: "100%",
              maxWidth: CANVAS_WIDTH,
              margin: "0 auto",
            }}
          >
            <SceneCanvas
              backgroundId={backgroundId}
              characterId={characterId}
              characterPos={characterPos}
              onCharacterChange={setCharacterPos}
              props={props}
              bubbles={bubbles}
              selectedUid={selectedUid}
              onSelect={setSelectedUid}
              onChangeProp={(next) =>
                setProps((arr) => arr.map((p) => (p.uid === next.uid ? next : p)))
              }
              onChangeBubble={(next) =>
                setBubbles((arr) => arr.map((b) => (b.uid === next.uid ? next : b)))
              }
              onDeleteProp={(uid) => {
                setProps((arr) => arr.filter((p) => p.uid !== uid));
                setSelectedUid(null);
              }}
              onDeleteBubble={(uid) => {
                setBubbles((arr) => arr.filter((b) => b.uid !== uid));
                setSelectedUid(null);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              type="button"
              onClick={addBubble}
              className="px-3 py-2 rounded-lg bg-sky-100 text-sky-900 text-sm font-semibold hover:bg-sky-200"
            >
              💬 Add text bubble
            </button>
            {selectedUid && selectedUid !== "character" && (
              <>
                <button
                  type="button"
                  onClick={() => bringForward(selectedUid)}
                  className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-sm font-semibold hover:bg-amber-200"
                >
                  ⬆ Bring forward
                </button>
                <button
                  type="button"
                  onClick={() => sendBackward(selectedUid)}
                  className="px-3 py-2 rounded-lg bg-amber-100 text-amber-900 text-sm font-semibold hover:bg-amber-200"
                >
                  ⬇ Send backward
                </button>
              </>
            )}
          </div>

          <div className="mt-4 bg-amber-50/80 rounded-xl p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
              Scene 1 narration
            </h3>
            <p className="text-base text-slate-800 leading-relaxed mb-2">{narration}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={reNarrate}
                disabled={rewriteState.loading}
                className="px-3 py-2 rounded-lg bg-amber-200 text-amber-900 text-sm font-semibold hover:bg-amber-300 disabled:opacity-60"
              >
                {rewriteState.loading ? "Re-narrating..." : "✨ Re-narrate scene 1"}
              </button>
              {typeof rewriteState.remaining === "number" && (
                <span className="text-xs text-slate-500">
                  {rewriteState.remaining} re-narrations left this session
                </span>
              )}
              {rewriteState.error && (
                <span className="text-xs text-rose-700">{rewriteState.error}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPlay({ propsPlaced: props.length, characterId, backgroundId })}
            className="mt-4 w-full px-5 py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg shadow hover:bg-emerald-700"
          >
            ▶ Play your story
          </button>
        </div>
      </div>

      <AssetPalette
        selectedBackgroundId={backgroundId}
        selectedCharacterId={characterId}
        onPickBackground={(id) => setBackgroundId(id)}
        onPickCharacter={(id) => setCharacterId(id)}
        onAddProp={addProp}
      />
    </div>
  );
}
