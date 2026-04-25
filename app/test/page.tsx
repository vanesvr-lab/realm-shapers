"use client";
import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase";

const supabase = browserSupabase();

type GeneratedRow = {
  title: string;
  narration: string;
  id: string;
  share_slug: string;
};

export default function TestPage() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (!cancelled) setAuthError(error.message);
        return;
      }
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          if (!cancelled) setAuthError(signInError.message);
          return;
        }
      }
      if (!cancelled) setAuthReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    setError(null);
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
      if (!res.ok) {
        setError(data.error ?? "Unknown error");
      } else {
        setResult(data as GeneratedRow);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (authError) {
    return (
      <main className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Realm Shapers Pipeline Test</h1>
        <p className="text-red-600">Auth error: {authError}</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Realm Shapers Pipeline Test</h1>
      <p className="text-sm text-slate-600 mb-4">
        {authReady ? "Anonymous session ready." : "Setting up your session..."}
      </p>
      <button
        onClick={handleGenerate}
        disabled={loading || !authReady}
        className="px-4 py-2 bg-amber-700 text-white rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Test World"}
      </button>
      {error && (
        <pre className="mt-6 p-4 bg-red-50 text-red-700 rounded text-sm whitespace-pre-wrap">
          {error}
        </pre>
      )}
      {result && (
        <div className="mt-6 space-y-2">
          <pre className="p-4 bg-slate-100 rounded text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
          <p className="text-sm text-slate-600">
            Saved as world id <code>{result.id}</code>, share slug{" "}
            <code>{result.share_slug}</code>.
          </p>
        </div>
      )}
    </main>
  );
}
