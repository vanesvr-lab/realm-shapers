"use client";
import { useState } from "react";
import { Rnd } from "react-rnd";

export type PlacedBubble = {
  uid: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

export function TextBubble({
  bubble,
  selected,
  onSelect,
  onChange,
  onDelete,
  bounds,
}: {
  bubble: PlacedBubble;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: PlacedBubble) => void;
  onDelete: () => void;
  bounds: string;
}) {
  const [editing, setEditing] = useState(bubble.text === "");

  return (
    <Rnd
      size={{ width: bubble.width, height: bubble.height }}
      position={{ x: bubble.x, y: bubble.y }}
      bounds={bounds}
      onDragStart={onSelect}
      onDragStop={(_, d) => onChange({ ...bubble, x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        onChange({
          ...bubble,
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          x: position.x,
          y: position.y,
        })
      }
      enableResizing={selected}
      style={{ zIndex: bubble.z, position: "absolute" }}
      disableDragging={editing}
    >
      <div
        className={`relative w-full h-full ${selected ? "ring-2 ring-sky-500 ring-offset-2 rounded-2xl" : ""}`}
        onMouseDown={onSelect}
        onDoubleClick={() => setEditing(true)}
      >
        <div className="absolute inset-0 bg-white/95 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-center p-3">
          {editing ? (
            <textarea
              autoFocus
              value={bubble.text}
              onChange={(e) => onChange({ ...bubble, text: e.target.value.slice(0, 120) })}
              onBlur={() => setEditing(false)}
              maxLength={120}
              placeholder="Type something..."
              className="w-full h-full resize-none bg-transparent text-center font-semibold text-amber-900 outline-none"
            />
          ) : (
            <p className="text-center font-semibold text-amber-900 leading-snug break-words">
              {bubble.text || "Tap to add text"}
            </p>
          )}
        </div>
        {selected && !editing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700"
            aria-label="Delete bubble"
          >
            ×
          </button>
        )}
      </div>
    </Rnd>
  );
}
