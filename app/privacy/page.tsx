import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="p-8 max-w-2xl mx-auto prose">
      <h1 className="text-2xl font-bold mb-4">Privacy Notice</h1>
      <p className="text-sm text-slate-600 mb-6">
        Last updated 2026-04-25. This is a hackathon-grade notice. Final wording
        will be reviewed by privacy counsel before public launch.
      </p>

      <h2 className="font-semibold mt-6 mb-2">Who we are</h2>
      <p>
        Realm Shapers is a creative game built for the Women Build AI
        Build-A-Thon 2026. The service is operated by Vanessa Rangasamy. Contact:
        support@realm-shapers.example (replace before public launch).
      </p>

      <h2 className="font-semibold mt-6 mb-2">Information we collect</h2>
      <p>
        From the parent or guardian: email address (used for magic-link login
        and account-related contact).
      </p>
      <p>
        From the child: a chosen username (must be a non-identifying handle, no
        real names), and the worlds the child creates (each world is a title, a
        narration, and the four ingredients the child entered).
      </p>
      <p>
        We do not collect: real names, photos, geolocation, IP-based behavioral
        profiles, or third-party tracking data.
      </p>

      <h2 className="font-semibold mt-6 mb-2">How we use information</h2>
      <p>
        To let the child save and revisit their worlds across sessions and
        devices. To contact the parent for account-related matters (consent
        revocation, data deletion requests).
      </p>

      <h2 className="font-semibold mt-6 mb-2">Sharing</h2>
      <p>
        Each world has a unique share link. Anyone with the link can view the
        world&apos;s title, narration, and ingredients. We never display the
        child&apos;s username on a shared world page. We do not sell or share
        data with third-party advertisers.
      </p>

      <h2 className="font-semibold mt-6 mb-2">COPPA, GDPR-K, and the UK Children&apos;s Code</h2>
      <p>
        We use the &quot;email plus&quot; verifiable parental consent method: an email is
        sent to a parent or guardian, who confirms consent by clicking a magic
        link and pressing Continue on our consent page. We minimize data
        collection in line with the UK Children&apos;s Code&apos;s data minimization
        principle.
      </p>

      <h2 className="font-semibold mt-6 mb-2">Your rights</h2>
      <p>
        Parents may at any time email{" "}
        <strong>support@realm-shapers.example</strong> to:
      </p>
      <ul className="list-disc ml-6">
        <li>Review the data on the child&apos;s account</li>
        <li>Delete the account and all worlds</li>
        <li>Revoke consent for further data collection</li>
      </ul>

      <h2 className="font-semibold mt-6 mb-2">Data retention</h2>
      <p>
        We retain account and world data until the parent requests deletion or
        the account is deleted. Anonymous-only sessions (no parent consent
        given) are subject to periodic cleanup.
      </p>

      <h2 className="font-semibold mt-6 mb-2">Where data is stored</h2>
      <p>
        On Supabase (US region) and on Vercel (US region). Both are reputable
        hosting providers; their privacy policies apply additionally.
      </p>

      <p className="mt-8">
        <Link href="/" className="underline text-sm">
          Back to home
        </Link>
      </p>
    </main>
  );
}
