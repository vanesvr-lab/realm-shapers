import { notFound } from "next/navigation";
import { serviceRoleSupabase } from "@/lib/supabase-server";

type WorldRow = {
  title: string;
  narration: string;
  ingredients: {
    setting: string;
    character: string;
    goal: string;
    twist: string;
  };
};

export default async function SharedWorldPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = serviceRoleSupabase();
  const { data, error } = await supabase
    .from("worlds")
    .select("title, narration, ingredients")
    .eq("share_slug", params.slug)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const world = data as WorldRow;

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{world.title}</h1>
      <p className="text-lg mb-6">{world.narration}</p>

      <section className="bg-slate-50 rounded p-4 mb-8">
        <h2 className="font-semibold mb-2">The four ingredients</h2>
        <dl className="space-y-1 text-sm">
          <div>
            <dt className="inline font-medium">Setting: </dt>
            <dd className="inline">{world.ingredients.setting}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Character: </dt>
            <dd className="inline">{world.ingredients.character}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Goal: </dt>
            <dd className="inline">{world.ingredients.goal}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Twist: </dt>
            <dd className="inline">{world.ingredients.twist}</dd>
          </div>
        </dl>
      </section>

      <footer className="text-sm text-slate-500 border-t pt-4">
        Made on Realm Shapers
      </footer>
    </main>
  );
}
