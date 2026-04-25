# Realm Shapers

A creative AI game where players use 4 imagination ingredients to generate magical worlds and save them from The Fade.

Built for the Women Build AI Build-A-Thon 2026.

## Designed By

- **Vanessa Rangasamy** (builder, integration, product)
- **Anaya, age 11** (story design lead)
- **Kellen, age 11** (systems design lead)

See `docs/design-doc.md` for the full design vision.

## Stack

- Next.js 14 + TypeScript
- Tailwind CSS + Framer Motion + Lottie
- Supabase
- Anthropic Claude API
- ElevenLabs Sound Effects API
- Vercel

## Local Development

```
npm install
cp .env.example .env.local  # then fill in keys
npm run dev
```

Visit http://localhost:3000

## Required Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
ELEVENLABS_API_KEY=...
```

## Project Structure

```
app/                 Next.js routes
components/          React components
lib/                 utilities, API clients, prompts
docs/                design docs, roadmap, briefs, decisions
supabase/            DB schema and migrations
```

## Roadmap

See `docs/roadmap.md` for the layered phase plan.

## Submission

- Submission deadline: Friday May 1, 2026 @ 3:00 PM ET
- Build window: April 24 - May 1, 2026
