import { redirect } from "next/navigation";
import Link from "next/link";
import { serverSupabase } from "@/lib/supabase-server";
import type { StoryTree, WorldIngredients } from "@/lib/claude";
import { ACHIEVEMENT_DEFS } from "@/lib/achievements-types";
import { RealmCardThumb } from "@/components/RealmCardThumb";

type WorldRow = {
  id: string;
  title: string;
  narration: string;
  share_slug: string | null;
  created_at: string;
  map: StoryTree | null;
  ingredients: WorldIngredients | null;
};

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

  const [{ data: worlds }, { data: unlocks }] = await Promise.all([
    supabase
      .from("worlds")
      .select("id, title, narration, share_slug, created_at, map, ingredients")
      .order("created_at", { ascending: false }),
    supabase.from("user_achievements").select("achievement_id, unlocked_at"),
  ]);

  const unlockedIds = new Set((unlocks ?? []).map((u) => u.achievement_id as string));
  const secretsDiscovered = unlockedIds.has("secret_ending")
    ? Math.max(1, (unlocks ?? []).filter((u) => u.achievement_id === "secret_ending").length)
    : 0;

  const playable = (worlds ?? []) as WorldRow[];
  const unlockedCount = unlockedIds.size;
  const totalAchievements = ACHIEVEMENT_DEFS.length;

  return (
    <main className="p-6 sm:p-8 max-w-5xl mx-auto">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-950">{profile.username}</h1>
          <p className="text-sm text-amber-800/70">Your shaper profile</p>
        </div>
        <Link
          href="/"
          className="text-sm px-4 py-2 bg-amber-700 text-white rounded-lg font-semibold hover:bg-amber-800"
        >
          Make a new world
        </Link>
      </header>

      <section className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold text-amber-950">Your realm cards</h2>
          <p className="text-xs text-amber-800/70">
            {playable.length} {playable.length === 1 ? "realm" : "realms"} shaped
          </p>
        </div>

        {playable.length === 0 ? (
          <p className="text-sm text-slate-600 bg-amber-50 rounded-lg p-6 text-center">
            No realms yet. Click &quot;Make a new world&quot; to start.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {playable.map((w) => {
              if (!w.map || !Array.isArray(w.map.scenes)) {
                return (
                  <li
                    key={w.id}
                    className="rounded-2xl border border-amber-200 bg-white/70 p-4 flex flex-col"
                    style={{ aspectRatio: "3/4" }}
                  >
                    <h3 className="text-sm font-bold text-amber-950 line-clamp-2">{w.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-3 mt-1">{w.narration}</p>
                    <p className="mt-auto text-[10px] text-amber-700">
                      Older realm, no story tree.
                    </p>
                  </li>
                );
              }
              return (
                <li key={w.id}>
                  <RealmCardThumb
                    worldId={w.id}
                    title={w.title}
                    story={w.map}
                    ingredients={w.ingredients}
                    shareSlug={w.share_slug}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold text-amber-950">Achievements</h2>
          <p className="text-xs text-amber-800/70">
            {unlockedCount} / {totalAchievements} earned
          </p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ACHIEVEMENT_DEFS.map((def) => {
            const earned = unlockedIds.has(def.id);
            return (
              <li
                key={def.id}
                className={`relative rounded-xl p-3 border ${
                  earned
                    ? "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400 shadow"
                    : "bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-2xl flex-shrink-0 ${earned ? "" : "grayscale opacity-30"}`}
                    aria-hidden
                  >
                    {def.icon}
                  </span>
                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold leading-tight ${
                        earned ? "text-amber-950" : "text-slate-500"
                      }`}
                    >
                      {earned ? def.name : "?????"}
                    </h3>
                    <p
                      className={`text-xs leading-snug mt-0.5 ${
                        earned ? "text-amber-900/80" : "text-slate-400"
                      }`}
                    >
                      {def.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-200 p-5 flex items-center gap-4">
          <span className="text-4xl" aria-hidden>
            🔮
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-purple-700/80 font-semibold">
              Mysteries Discovered
            </p>
            <p className="text-2xl font-extrabold text-purple-900">{secretsDiscovered}</p>
            <p className="text-xs text-purple-900/70">
              Secret endings revealed across all your realms.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
