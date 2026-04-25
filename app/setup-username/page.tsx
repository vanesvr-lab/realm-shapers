"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase";
import { UsernameInput } from "@/components/UsernameInput";

export default function SetupUsernamePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = browserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user || !user.email) {
        router.replace("/");
        return;
      }
      const { data: existing } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (existing) {
        router.replace("/profile");
        return;
      }
      setReady(true);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSave(username: string) {
    const supabase = browserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) {
      throw new Error("Not signed in");
    }
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      parent_email: user.email,
      parent_consent_at:
        user.email_confirmed_at ?? new Date().toISOString(),
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("That name is taken. Try another.");
      }
      throw new Error(error.message);
    }
    router.replace("/profile");
  }

  if (pageError) {
    return (
      <main className="p-8 max-w-md mx-auto">
        <p className="text-red-600">{pageError}</p>
      </main>
    );
  }
  if (!ready) {
    return (
      <main className="p-8 max-w-md mx-auto">
        <p className="text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Name your shaper</h1>
      <p className="text-slate-600 mb-6">
        This is how you&apos;ll be known on Realm Shapers. You can&apos;t change
        it later in this version, so pick something you like.
      </p>
      <UsernameInput onValid={handleSave} />
    </main>
  );
}
