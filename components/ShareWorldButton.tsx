"use client";
import { useState } from "react";

export function ShareWorldButton({ shareSlug }: { shareSlug: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window === "undefined"
      ? `/w/${shareSlug}`
      : `${window.location.origin}/w/${shareSlug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm px-3 py-1 bg-emerald-700 text-white rounded"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
