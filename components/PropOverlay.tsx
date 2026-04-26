"use client";
import Image from "next/image";
import { Rnd } from "react-rnd";
import { assetUrlById, ASSETS_BY_ID } from "@/lib/asset-library";

export type PlacedProp = {
  uid: string;
  asset_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

export function PropOverlay({
  prop,
  selected,
  onSelect,
  onChange,
  onDelete,
  bounds,
}: {
  prop: PlacedProp;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: PlacedProp) => void;
  onDelete: () => void;
  bounds: string;
}) {
  const url = assetUrlById(prop.asset_id);
  const meta = ASSETS_BY_ID[prop.asset_id];
  if (!url || !meta) return null;

  return (
    <Rnd
      size={{ width: prop.width, height: prop.height }}
      position={{ x: prop.x, y: prop.y }}
      bounds={bounds}
      onDragStart={onSelect}
      onDragStop={(_, d) => onChange({ ...prop, x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        onChange({
          ...prop,
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          x: position.x,
          y: position.y,
        })
      }
      lockAspectRatio
      enableResizing={selected}
      style={{ zIndex: prop.z, position: "absolute" }}
      className={selected ? "ring-2 ring-amber-500 ring-offset-2 rounded" : ""}
    >
      <div className="relative w-full h-full" onMouseDown={onSelect}>
        <Image
          src={url}
          alt={meta.alt}
          fill
          unoptimized
          draggable={false}
          className="pointer-events-none select-none object-contain"
          sizes="200px"
        />
        {selected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-bold shadow hover:bg-rose-700"
            aria-label="Delete prop"
          >
            ×
          </button>
        )}
      </div>
    </Rnd>
  );
}
