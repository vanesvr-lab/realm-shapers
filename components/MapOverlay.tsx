"use client";

// B-018: explored-path map overlay. Renders the active story as an
// abstract node-graph derived from each scene's choice.next_scene_id and
// choice_options.goes_to edges. Visited scenes are filled and labelled,
// the current scene pulses, one-hop unvisited neighbors render as silent
// outlines (no spoilers), everything else stays hidden.
//
// Layout: BFS columns from starting_scene_id. Column = depth, row =
// position within the depth bucket. No hand-authored coords required, so
// this works for both the hand-authored adventure and any future Claude
// generated tree.

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StoryScene, StoryTree } from "@/lib/claude";

const COL_W = 160;
const ROW_H = 70;
const NODE_R = 14;
const PAD_X = 60;
const PAD_Y = 60;

type NodeInfo = {
  id: string;
  title: string;
  depth: number;
  rowIndex: number;
  x: number;
  y: number;
  outEdges: string[];
  isEnding: boolean;
};

type Layout = {
  nodes: NodeInfo[];
  byId: Map<string, NodeInfo>;
  width: number;
  height: number;
};

function buildLayout(story: StoryTree): Layout {
  const sceneById = new Map<string, StoryScene>();
  for (const s of story.scenes) sceneById.set(s.id, s);
  if (story.secret_ending) sceneById.set(story.secret_ending.id, story.secret_ending);

  const depth = new Map<string, number>();
  const order: string[] = [];
  const queue: string[] = [story.starting_scene_id];
  depth.set(story.starting_scene_id, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    const scene = sceneById.get(id);
    if (!scene) continue;
    const d = depth.get(id) ?? 0;
    const nexts: string[] = [];
    for (const c of scene.choices) nexts.push(c.next_scene_id);
    if (scene.choice_options) for (const o of scene.choice_options) nexts.push(o.goes_to);
    for (const n of nexts) {
      if (!sceneById.has(n)) continue;
      if (depth.has(n)) continue;
      depth.set(n, d + 1);
      queue.push(n);
    }
  }

  // Place orphan scenes (unreachable from start, e.g., the secret ending
  // when the kid never triggers it) in a trailing column so they exist in
  // the graph but stay hidden until the secret-eligibility flow reveals
  // them via visited.
  let maxDepth = 0;
  depth.forEach((d) => {
    if (d > maxDepth) maxDepth = d;
  });
  for (const s of story.scenes) {
    if (!depth.has(s.id)) depth.set(s.id, maxDepth + 1);
  }
  if (story.secret_ending && !depth.has(story.secret_ending.id)) {
    depth.set(story.secret_ending.id, maxDepth + 1);
  }

  const byDepth = new Map<number, string[]>();
  depth.forEach((d, id) => {
    const arr = byDepth.get(d);
    if (arr) arr.push(id);
    else byDepth.set(d, [id]);
  });
  byDepth.forEach((ids) => ids.sort());

  const nodes: NodeInfo[] = [];
  Array.from(byDepth.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([d, ids]) => {
      ids.forEach((id, i) => {
        const scene = sceneById.get(id);
        if (!scene) return;
        const outEdges: string[] = [];
        for (const c of scene.choices) outEdges.push(c.next_scene_id);
        if (scene.choice_options) for (const o of scene.choice_options) outEdges.push(o.goes_to);
        nodes.push({
          id,
          title: scene.title,
          depth: d,
          rowIndex: i,
          x: PAD_X + d * COL_W,
          y: PAD_Y + i * ROW_H,
          outEdges,
          isEnding: scene.choices.length === 0 && !scene.is_choice_scene,
        });
      });
    });

  let maxRows = 0;
  byDepth.forEach((ids) => {
    if (ids.length > maxRows) maxRows = ids.length;
  });
  const width = PAD_X * 2 + Math.max(0, byDepth.size - 1) * COL_W;
  const height = PAD_Y * 2 + Math.max(0, maxRows - 1) * ROW_H;

  const byId = new Map<string, NodeInfo>();
  for (const n of nodes) byId.set(n.id, n);

  return { nodes, byId, width, height };
}

export function MapOverlay({
  story,
  currentSceneId,
  visited,
  onClose,
}: {
  story: StoryTree;
  currentSceneId: string;
  visited: Set<string>;
  onClose: () => void;
}) {
  const layout = useMemo(() => buildLayout(story), [story]);

  const visibleIds = useMemo(() => {
    const allowed = new Set<string>();
    visited.forEach((id) => allowed.add(id));
    allowed.add(currentSceneId);
    visited.forEach((id) => {
      const node = layout.byId.get(id);
      if (!node) return;
      for (const next of node.outEdges) {
        if (layout.byId.has(next)) allowed.add(next);
      }
    });
    return allowed;
  }, [layout, visited, currentSceneId]);

  const visibleNodes = layout.nodes.filter((n) => visibleIds.has(n.id));
  const edges: { from: NodeInfo; to: NodeInfo }[] = [];
  for (const n of layout.nodes) {
    if (!visibleIds.has(n.id)) continue;
    for (const next of n.outEdges) {
      const target = layout.byId.get(next);
      if (!target) continue;
      if (!visibleIds.has(target.id)) continue;
      edges.push({ from: n, to: target });
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="map-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/80 flex flex-col p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Realm map"
        onClick={onClose}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-amber-100">
            Where you have been
          </h2>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close map"
            className="px-3 py-1.5 rounded-lg bg-white/95 text-amber-900 font-semibold text-sm shadow"
          >
            Close
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-auto rounded-2xl bg-slate-900/70 ring-1 ring-amber-200/30"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            viewBox={`0 0 ${Math.max(layout.width, 320)} ${Math.max(layout.height, 240)}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full block"
            role="img"
            aria-label="Scene graph of the realm"
          >
            {edges.map((e, i) => {
              const visitedFrom = visited.has(e.from.id);
              const visitedTo = visited.has(e.to.id);
              const opacity = visitedFrom && visitedTo ? 0.85 : 0.35;
              return (
                <line
                  key={`edge-${i}`}
                  x1={e.from.x}
                  y1={e.from.y}
                  x2={e.to.x}
                  y2={e.to.y}
                  stroke="#fde68a"
                  strokeWidth={1.5}
                  strokeOpacity={opacity}
                  strokeDasharray={visitedFrom && visitedTo ? undefined : "4 4"}
                />
              );
            })}
            {visibleNodes.map((n) => {
              const isCurrent = n.id === currentSceneId;
              const isVisited = visited.has(n.id);
              const fill = isCurrent
                ? "#fbbf24"
                : isVisited
                ? "#f59e0b"
                : "transparent";
              const stroke = isCurrent ? "#fef3c7" : "#fde68a";
              return (
                <g
                  key={`node-${n.id}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (isVisited || isCurrent) onClose();
                  }}
                  style={{ cursor: isVisited || isCurrent ? "pointer" : "default" }}
                >
                  {isCurrent && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={NODE_R + 8}
                      fill="none"
                      stroke="#fef3c7"
                      strokeWidth={1.5}
                      opacity={0.6}
                    >
                      <animate
                        attributeName="r"
                        values={`${NODE_R + 4};${NODE_R + 12};${NODE_R + 4}`}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.1;0.6"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.isEnding ? NODE_R + 3 : NODE_R}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={n.isEnding ? 2.5 : 2}
                  />
                  {(isVisited || isCurrent) && (
                    <text
                      x={n.x}
                      y={n.y + NODE_R + 14}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={isCurrent ? 700 : 500}
                      fill="#fef3c7"
                    >
                      {n.title}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <p className="text-xs text-amber-100/80 mt-3 text-center">
          Filled circles are places you have been. The pulsing one is where you stand. Outlines hint at what is next.
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
