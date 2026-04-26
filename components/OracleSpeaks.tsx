"use client";
import { useEffect } from "react";
import { speakOracle, type OracleLineKind } from "@/lib/oracle-bus";

// Declarative trigger: emits an Oracle line whenever `text` (or `triggerKey`)
// changes. The visible bubble + audio are rendered by the singleton
// OracleAvatar mounted in layout.
export function OracleSpeaks({
  text,
  kind,
  triggerKey,
  delayMs = 0,
  oncePerSessionKey,
}: {
  text: string;
  kind: OracleLineKind;
  triggerKey?: string | number;
  delayMs?: number;
  oncePerSessionKey?: string;
}) {
  useEffect(() => {
    if (!text?.trim()) return;
    if (oncePerSessionKey) {
      try {
        const k = `realm-shapers:spoken:${oncePerSessionKey}`;
        if (sessionStorage.getItem(k) === "1") return;
        sessionStorage.setItem(k, "1");
      } catch {
        // ignore
      }
    }
    const t = setTimeout(() => speakOracle({ text, kind }), Math.max(0, delayMs));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, triggerKey]);
  return null;
}
