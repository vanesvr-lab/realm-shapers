"use client";
import { useState } from "react";
import { validateUsername } from "@/lib/username";

export function UsernameInput({
  onValid,
}: {
  onValid: (username: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = validateUsername(raw);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmitting(true);
    try {
      await onValid(result.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Pick a username</label>
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="dragon92"
          className="w-full px-3 py-2 border rounded"
          autoFocus
        />
        <p className="text-xs text-slate-600 mt-1">
          3 to 20 lowercase letters, numbers, or underscores. Pick a fun made-up
          name. No real names, phone numbers, or emails.
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-amber-700 text-white rounded disabled:opacity-50"
      >
        {submitting ? "Saving..." : "That's me"}
      </button>
    </form>
  );
}
