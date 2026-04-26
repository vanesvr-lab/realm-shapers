import { redirect } from "next/navigation";
import Link from "next/link";
import { serverSupabase } from "@/lib/supabase-server";
import { LandingForm } from "@/components/LandingForm";
import { StylePicker } from "@/components/StylePicker";

export default async function Home() {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user && user.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      redirect("/consent");
    }
    username = profile.username;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50">
      <StylePicker />

      {username && (
        <div className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-end gap-4">
          <Link
            href="/preview-3d"
            className="text-sm text-emerald-800 underline hover:no-underline"
          >
            🎮 3D preview
          </Link>
          <Link
            href="/profile"
            className="text-sm text-amber-800 underline hover:no-underline"
          >
            {username}&apos;s profile
          </Link>
        </div>
      )}

      <section className="max-w-3xl mx-auto px-6 pt-10 pb-6 text-center">
        <p className="text-sm uppercase tracking-widest text-amber-700 mb-3">
          Realm Shapers
        </p>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-amber-900 mb-4 text-balance">
          Shape your own realm
        </h1>
        <p className="text-lg text-slate-700 max-w-xl mx-auto text-balance">
          Pick four ingredients. The Oracle will weave them into a small
          choose-your-own-adventure with art, sound, and a scene you can edit.
        </p>
      </section>

      <section className="max-w-xl mx-auto px-6 pb-16">
        <div className="bg-white/80 rounded-3xl shadow-xl p-6 sm:p-8 backdrop-blur">
          <LandingForm />
        </div>
        <p className="text-xs text-center text-slate-500 mt-6">
          Built by Vanessa, Anaya, and Kellen.{" "}
          <Link href="/privacy" className="underline">
            Privacy notice
          </Link>
          .
        </p>
        {!username && (
          <p className="text-xs text-center text-slate-500 mt-2">
            <Link href="/preview-3d" className="underline">
              Peek at our 3D preview
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
