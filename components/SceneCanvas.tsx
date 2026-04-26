"use client";
import Image from "next/image";
import { useRef } from "react";
import { Rnd } from "react-rnd";
import { assetUrlById, ASSETS_BY_ID } from "@/lib/asset-library";
import { PropOverlay, type PlacedProp } from "@/components/PropOverlay";
import { TextBubble, type PlacedBubble } from "@/components/TextBubble";

export function SceneCanvas({
  backgroundId,
  characterId,
  characterPos,
  onCharacterChange,
  props: placedProps,
  bubbles,
  selectedUid,
  onSelect,
  onChangeProp,
  onChangeBubble,
  onDeleteProp,
  onDeleteBubble,
  readOnly = false,
}: {
  backgroundId: string;
  characterId: string;
  characterPos: { x: number; y: number; width: number; height: number };
  onCharacterChange: (next: { x: number; y: number; width: number; height: number }) => void;
  props: PlacedProp[];
  bubbles: PlacedBubble[];
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
  onChangeProp: (next: PlacedProp) => void;
  onChangeBubble: (next: PlacedBubble) => void;
  onDeleteProp: (uid: string) => void;
  onDeleteBubble: (uid: string) => void;
  readOnly?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const bgUrl = assetUrlById(backgroundId);
  const charUrl = assetUrlById(characterId);
  const charMeta = ASSETS_BY_ID[characterId];

  return (
    <div
      ref={canvasRef}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      className="relative w-full bg-slate-200 rounded-2xl overflow-hidden shadow-inner"
      style={{ aspectRatio: "16 / 9" }}
    >
      {bgUrl && (
        <Image
          src={bgUrl}
          alt="Scene background"
          fill
          unoptimized
          priority
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover pointer-events-none select-none"
        />
      )}

      {charUrl && charMeta && (
        readOnly ? (
          <div
            className="absolute"
            style={{
              left: characterPos.x,
              top: characterPos.y,
              width: characterPos.width,
              height: characterPos.height,
              zIndex: 10,
            }}
          >
            <Image
              src={charUrl}
              alt={charMeta.alt}
              fill
              unoptimized
              sizes="200px"
              draggable={false}
              className="pointer-events-none select-none object-contain drop-shadow-lg"
            />
          </div>
        ) : (
          <PropOverlayCharacter
            url={charUrl}
            alt={charMeta.alt}
            pos={characterPos}
            selected={selectedUid === "character"}
            onSelect={() => onSelect("character")}
            onChange={onCharacterChange}
            bounds={canvasRef.current ? "parent" : "parent"}
          />
        )
      )}

      {placedProps.map((p) => (
        readOnly ? (
          <div
            key={p.uid}
            className="absolute"
            style={{ left: p.x, top: p.y, width: p.width, height: p.height, zIndex: p.z }}
          >
            <Image
              src={assetUrlById(p.asset_id) ?? ""}
              alt={ASSETS_BY_ID[p.asset_id]?.alt ?? ""}
              fill
              unoptimized
              draggable={false}
              sizes="200px"
              className="pointer-events-none select-none object-contain"
            />
          </div>
        ) : (
          <PropOverlay
            key={p.uid}
            prop={p}
            selected={selectedUid === p.uid}
            onSelect={() => onSelect(p.uid)}
            onChange={onChangeProp}
            onDelete={() => onDeleteProp(p.uid)}
            bounds="parent"
          />
        )
      ))}

      {bubbles.map((b) => (
        readOnly ? (
          <div
            key={b.uid}
            className="absolute bg-white/95 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-center p-3"
            style={{ left: b.x, top: b.y, width: b.width, height: b.height, zIndex: b.z }}
          >
            <p className="text-center font-semibold text-amber-900 leading-snug break-words">
              {b.text}
            </p>
          </div>
        ) : (
          <TextBubble
            key={b.uid}
            bubble={b}
            selected={selectedUid === b.uid}
            onSelect={() => onSelect(b.uid)}
            onChange={onChangeBubble}
            onDelete={() => onDeleteBubble(b.uid)}
            bounds="parent"
          />
        )
      ))}
    </div>
  );
}

function PropOverlayCharacter({
  url,
  alt,
  pos,
  selected,
  onSelect,
  onChange,
  bounds,
}: {
  url: string;
  alt: string;
  pos: { x: number; y: number; width: number; height: number };
  selected: boolean;
  onSelect: () => void;
  onChange: (next: { x: number; y: number; width: number; height: number }) => void;
  bounds: string;
}) {
  return (
    <Rnd
      size={{ width: pos.width, height: pos.height }}
      position={{ x: pos.x, y: pos.y }}
      bounds={bounds}
      onDragStart={onSelect}
      onDragStop={(_, d) => onChange({ ...pos, x: d.x, y: d.y })}
      onResizeStop={(_, __, ref, ___, position) =>
        onChange({
          ...pos,
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          x: position.x,
          y: position.y,
        })
      }
      lockAspectRatio
      enableResizing={selected}
      style={{ zIndex: 10, position: "absolute" }}
      className={selected ? "ring-2 ring-emerald-500 ring-offset-2 rounded" : ""}
    >
      <div className="relative w-full h-full" onMouseDown={onSelect}>
        <Image
          src={url}
          alt={alt}
          fill
          unoptimized
          draggable={false}
          sizes="240px"
          className="pointer-events-none select-none object-contain drop-shadow-lg"
        />
      </div>
    </Rnd>
  );
}
