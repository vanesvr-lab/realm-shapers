import { redirect } from "next/navigation";
import Link from "next/link";
import { serverSupabase } from "@/lib/supabase-server";

export default async function ConsentPage() {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/");

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Before your child plays</h1>
      <p className="text-slate-600 mb-6">
        You&apos;re signing in as <strong>{user.email}</strong>. Please read this
        before continuing. By clicking Continue you confirm you are the parent or
        legal guardian of this child and you consent to the collection and use
        described below.
      </p>

      <section className="mb-4">
        <h2 className="font-semibold mb-1">What we collect</h2>
        <p className="text-sm">
          The username your child chooses, the worlds they create (title,
          narration, the four ingredients), and your email address.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-1">What we do not collect</h2>
        <p className="text-sm">
          Real name, photo, geolocation, IP-based behavioral profile, third-party
          tracking.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-1">How we use it</h2>
        <p className="text-sm">
          So your child can save and revisit their worlds. So we can contact you
          for account-related requests.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-1">Who sees it</h2>
        <p className="text-sm">
          Your child sees their own worlds. Anyone with a share link can see a
          world&apos;s title, narration, and ingredients but never your child&apos;s
          username. We do not sell or share data with third parties.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold mb-1">Your rights</h2>
        <p className="text-sm">
          Email <strong>support@realm-shapers.example</strong> (placeholder for
          hackathon; replace before public launch) to review, delete, or revoke
          consent at any time.
        </p>
      </section>

      <p className="text-sm mb-6">
        <Link href="/privacy" className="underline">
          Read the full Privacy Notice
        </Link>
      </p>

      <Link
        href="/setup-username"
        className="inline-block px-4 py-2 bg-amber-700 text-white rounded"
      >
        Continue
      </Link>
    </main>
  );
}
