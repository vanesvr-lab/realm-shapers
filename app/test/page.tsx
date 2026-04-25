"use client";
import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting: "Underwater library carved from coral",
          character: "A forgetful octopus librarian",
          goal: "Find the stolen Book of Tides",
          twist: "The thief is her own shadow",
        }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Realm Shapers Pipeline Test</h1>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-amber-700 text-white rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Test World"}
      </button>
      <pre className="mt-6 p-4 bg-slate-100 rounded text-sm whitespace-pre-wrap">
        {result}
      </pre>
    </main>
  );
}
