import { redirect } from "next/navigation";
import Link from "next/link";
import { serverSupabase } from "@/lib/supabase-server";
import { ShareWorldButton } from "@/components/ShareWorldButton";

export default async function ProfilePage() {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/setup-username");

  const { data: worlds } = await supabase
    .from("worlds")
    .select("id, title, narration, share_slug, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <p className="text-sm text-slate-600">Your shaper profile</p>
        </div>
        <Link
          href="/"
          className="text-sm px-3 py-2 bg-amber-700 text-white rounded"
        >
          Make a new world
        </Link>
      </header>

      <h2 className="font-semibold mb-3">Your worlds</h2>
      {(!worlds || worlds.length === 0) && (
        <p className="text-sm text-slate-600">
          No worlds yet. Click &quot;Make a new world&quot; to start.
        </p>
      )}
      <ul className="space-y-3">
        {worlds?.map((w) => (
          <li
            key={w.id}
            className="p-4 border rounded flex items-start justify-between gap-3"
          >
            <div className="flex-1">
              <div className="font-semibold">{w.title}</div>
              <div className="text-sm text-slate-600 mt-1">{w.narration}</div>
            </div>
            <ShareWorldButton shareSlug={w.share_slug} />
          </li>
        ))}
      </ul>
    </main>
  );
}
