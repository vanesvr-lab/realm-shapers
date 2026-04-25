# ADR-001: SVG Maps Over AI-Generated Images

**Date:** 2026-04-24
**Status:** Accepted
**Decided by:** Vanessa, with input from kid playtesting context

## Context

Realm Shapers needs a visual representation of each generated world. Three options were considered:

1. AI-generated images (DALL-E, Flux, Stable Diffusion)
2. Animated SVG maps rendered from structured Claude JSON
3. Hybrid (image + map overlay)

## Decision

We use **animated SVG maps rendered from structured Claude JSON**.

## Rationale

**For:**
- More unique. Most hackathon submissions will be "ChatGPT wrapper with DALL-E." SVG maps are rarer and more memorable.
- Cheaper. SVG maps cost nothing per generation; image APIs cost $0.01-$0.04 each, adding up over playtesting.
- Faster. SVG renders instantly once JSON arrives. Image generation adds 5-15s of latency, threatening the 60-second creation goal.
- More interactive. Maps can have clickable regions, hover states, animated path reveals. Static images can't.
- Consistent visual identity. All maps share a hand-drawn style. AI images vary wildly in style across generations.
- Reusable. Map JSON structure scales to Phase 2 (room-by-room exploration) without rework.

**Against:**
- Less visceral wow on first sight. A great DALL-E image is more immediately impressive than an SVG map.
- Requires upfront design work to define the map visual style.
- More frontend code to write (SVG rendering layer).

## Consequences

- We commit to a "fantasy parchment map" aesthetic across all worlds.
- Claude API prompts must request structured JSON for map data, not just narration.
- Phase 2 can extend the map structure (rooms, paths, landmarks) without breaking MVP.
- If we change our mind later, image generation can be ADDED as an alternate output mode without removing SVG maps.

## Alternatives Considered

- **DALL-E only:** Rejected. Latency, cost, and "ChatGPT wrapper" perception.
- **Hybrid (image + map):** Rejected for MVP. Doubles the failure modes and latency. May return in Phase 3.
