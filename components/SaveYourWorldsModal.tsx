"use client";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase";

export function SaveYourWorldsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = browserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: updateError } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: redirectTo }
      );
      if (updateError) {
        setError(updateError.message);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <>
            <h2 className="text-xl font-bold mb-2">Check the grown-up&apos;s email</h2>
            <p className="mb-4">
              We sent a magic link to <strong>{email}</strong>. Have them click it
              to save your worlds.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-700 text-white rounded"
            >
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-2">Save your worlds</h2>
            <p className="mb-4 text-sm">
              Ask a grown-up to type their email so we can save your worlds and
              let you come back to them tomorrow.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="grownup@example.com"
              className="w-full px-3 py-2 border rounded mb-3"
            />
            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-700 text-white rounded disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send link"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
