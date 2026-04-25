# B-001: Project Scaffold

> Implementation brief for Day 1. Read CLAUDE.md and CHANGES.md first.

## Goal

By the end of this batch, we have a working Next.js project deployed to Vercel with a "hello world" Claude API call returning a fake world from 4 hardcoded ingredients. No UI yet, no map, no soundscape. Just proof that the pipeline works end-to-end.

## Acceptance Criteria

- [ ] Repo initialized with Next.js 14 (App Router) + TypeScript strict
- [ ] Tailwind, Framer Motion, lottie-react, @anthropic-ai/sdk, @supabase/supabase-js installed
- [ ] `lib/claude.ts` exports a function `generateWorld(ingredients)` that calls Claude API and returns structured JSON
- [ ] `app/api/generate/route.ts` POST endpoint accepts ingredients, calls generateWorld, returns JSON
- [ ] Test page at `app/test/page.tsx` with a button that hits the API and renders the JSON response
- [ ] Project deploys successfully to Vercel (preview URL)
- [ ] `.env.local` template documented in README (which env vars are needed, where to get them)
- [ ] CHANGES.md updated, pushed to GitHub

## Stack Confirmations Before Starting

Run these checks. Stop if any fail and report which.

```
node --version       # must be >= 20
npm --version        # any recent version
git --version        # any recent
gh --version         # GitHub CLI for repo creation
```

## Step-by-Step

### 1. Repo + Next.js init

```
cd ~/projects   # or wherever Vanessa keeps her projects
npx create-next-app@latest realm-shapers \
  --typescript --tailwind --app --eslint \
  --src-dir false --import-alias "@/*"
cd realm-shapers
```

When prompted about Turbopack: **No** (less stable for hackathon).

### 2. Drop the kickoff package

Vanessa will provide CLAUDE.md, CHANGES.md, .gitignore, .claude/settings.json, docs/* from the kickoff zip. Place them in the repo root before first commit.

### 3. Install runtime dependencies

```
npm install @anthropic-ai/sdk @supabase/supabase-js framer-motion lottie-react
```

### 4. Install dev dependencies

```
npm install -D @types/node
```

### 5. Create lib/claude.ts

```typescript
// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type WorldIngredients = {
  setting: string;
  character: string;
  goal: string;
  twist: string;
};

export type GeneratedWorld = {
  title: string;
  narration: string;
  // map and sidekick fields will be added in B-002 and B-005
};

export async function generateWorld(
  ingredients: WorldIngredients
): Promise<GeneratedWorld> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: buildPrompt(ingredients),
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("");

  return parseWorldResponse(text);
}

function buildPrompt(i: WorldIngredients): string {
  return `You are the Oracle in a creative game called Realm Shapers. A young player has given you four ingredients to shape a world. Generate a short, evocative world description.

Ingredients:
- Setting: ${i.setting}
- Character: ${i.character}
- Goal: ${i.goal}
- Twist: ${i.twist}

Respond ONLY with JSON in this exact shape, no preamble or markdown:
{
  "title": "A short evocative title for this realm",
  "narration": "2-3 sentences narrating the world to the player. Warm, magical, age-appropriate for an 11-year-old."
}`;
}

function parseWorldResponse(raw: string): GeneratedWorld {
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.title || !parsed.narration) {
    throw new Error("Invalid world response from Claude");
  }
  return parsed as GeneratedWorld;
}
```

### 6. Create app/api/generate/route.ts

```typescript
// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateWorld, WorldIngredients } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WorldIngredients;
    if (!body.setting || !body.character || !body.goal || !body.twist) {
      return NextResponse.json(
        { error: "All four ingredients required" },
        { status: 400 }
      );
    }
    const world = await generateWorld(body);
    return NextResponse.json(world);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### 7. Create app/test/page.tsx

```typescript
// app/test/page.tsx
"use client";
import { useState } from "react";

export default function TestPage() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult("");
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
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Realm Shapers Pipeline Test</h1>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-amber-700 text-white rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Test World"}
      </button>
      <pre className="mt-6 p-4 bg-slate-100 rounded text-sm whitespace-pre-wrap">
        {result}
      </pre>
    </main>
  );
}
```

### 8. Environment setup

Create `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get the key from https://console.anthropic.com/settings/keys if not already in Vanessa's keychain.

Document the env vars in README.md for future reference.

### 9. Local smoke test

```
npm run dev
```

Visit http://localhost:3000/test. Click button. Should see a JSON response with title and narration. If yes, pipeline works.

### 10. Git + GitHub setup

```
git init
git add .  # FIRST commit only, this is the exception to the never-git-add-dot rule
git commit -m "initial scaffold"
gh repo create realm-shapers --public --source=. --push
```

### 11. Vercel deploy

```
npm install -g vercel
vercel login
vercel link
# Add ANTHROPIC_API_KEY to Vercel project env vars (via dashboard or CLI)
vercel env add ANTHROPIC_API_KEY production
vercel --prod
```

Visit the production URL `/test`, click button, verify it works in production.

### 12. Wrap up

- Update CHANGES.md with B-001 entry
- Verify `git status` is clean
- `git push`
- Report production URL and one-line summary in chat

## Out of Scope for B-001

These are coming in later batches. Do NOT build them now:

- Real UI for entering 4 ingredients (B-003)
- SVG map rendering (B-002)
- Soundscape (B-004)
- Supabase setup (B-005)
- Projects Tab (B-006)
- Oracle character (B-008)
- Anything from Layer 2 or Layer 3

## Risks and Mitigations

- **Risk:** Claude returns malformed JSON, breaks parser. **Mitigation:** Try/catch in parseWorldResponse, log raw text on failure.
- **Risk:** Vercel deploy fails due to missing env vars. **Mitigation:** Add env vars BEFORE first deploy, not after.
- **Risk:** Hot reload breaks during dev. **Mitigation:** Dev server restart pattern in CLAUDE.md.
- **Risk:** API key accidentally committed. **Mitigation:** .gitignore covers .env.local; verify with `git status` before first commit.

## Definition of Done

The Vercel production URL `/test` page, when the button is clicked, returns a valid `{ title, narration }` JSON within 10 seconds. Once that works, B-001 is complete.
