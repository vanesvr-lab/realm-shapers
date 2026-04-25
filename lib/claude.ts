import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-opus-4-7";

export type WorldIngredients = {
  setting: string;
  character: string;
  goal: string;
  twist: string;
};

export type MapLocation = {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string;
  description: string;
};

export type WorldMap = {
  background_color: string;
  terrain_paths: string[];
  locations: MapLocation[];
  character_emoji: string;
};

export type GeneratedWorld = {
  title: string;
  narration: string;
  map: WorldMap;
  audio_prompt: string;
};

export type IngredientSlot = "setting" | "character" | "goal" | "twist";

export async function generateWorld(
  ingredients: WorldIngredients
): Promise<GeneratedWorld> {
  try {
    const text = await callClaude(buildWorldPrompt(ingredients), 2048);
    return parseWorldResponse(text);
  } catch {
    try {
      const text = await callClaude(buildWorldPrompt(ingredients), 2048);
      return parseWorldResponse(text);
    } catch {
      return defaultWorld(ingredients);
    }
  }
}

export async function generateIdeas(
  slot: IngredientSlot,
  current: WorldIngredients
): Promise<string[]> {
  const text = await callClaude(buildIdeasPrompt(slot, current), 512);
  return parseIdeasResponse(text);
}

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("");
}

function buildWorldPrompt(i: WorldIngredients): string {
  return `You are the Oracle in a creative game called Realm Shapers. A young player (around age 11) gives you four ingredients. You shape a small world from them.

Ingredients:
- Setting: ${i.setting}
- Character: ${i.character}
- Goal: ${i.goal}
- Twist: ${i.twist}

Respond ONLY with JSON in EXACTLY this shape, no preamble, no markdown, no comments:
{
  "title": "string, 2 to 6 words, evocative",
  "narration": "string, 2 to 3 sentences, warm and magical, age-appropriate, addresses the player as 'you'",
  "map": {
    "background_color": "string, a hex color like #1e3a5f that fits the setting mood",
    "terrain_paths": ["array of 1 to 4 SVG path 'd' attribute strings drawn inside a 0-100 by 0-100 viewBox; soft organic shapes like coastlines, mountain ridges, rivers"],
    "locations": [
      {
        "id": "lowercase_snake_slug",
        "name": "Human friendly title, 1 to 4 words",
        "x": 0,
        "y": 0,
        "icon": "single emoji, ONE character, kid friendly",
        "description": "1 to 2 sentences narrating what happens when the character arrives here. Address the player as 'you'."
      }
    ],
    "character_emoji": "single emoji, ONE character, matches the character ingredient"
  },
  "audio_prompt": "string, short ambient soundscape description for ElevenLabs Sound Effects, 5 to 12 words, no music, just environment sounds"
}

Hard rules:
- locations array length MUST be 3, 4, or 5 (inclusive)
- locations are listed in walk order, the character visits them in this sequence
- every x and y MUST be a number between 5 and 95 (inclusive); spread them across the map, do not cluster
- icon and character_emoji MUST each be exactly one emoji glyph
- background_color MUST be a 7-character hex string starting with #
- audio_prompt MUST describe ambient sound only (waves, wind, rustling leaves, distant chimes), NEVER music or speech`;
}

function buildIdeasPrompt(slot: IngredientSlot, current: WorldIngredients): string {
  const labels: Record<IngredientSlot, string> = {
    setting: "Setting (a place where the story happens)",
    character: "Character (the hero or main creature)",
    goal: "Goal (what the character wants to do)",
    twist: "Twist (a surprising turn or rule)",
  };
  const others = (Object.keys(current) as IngredientSlot[])
    .filter((k) => k !== slot && current[k]?.trim())
    .map((k) => `- ${k}: ${current[k]}`)
    .join("\n");
  const context = others
    ? `The player has already chosen:\n${others}\n\n`
    : "The player has not chosen any other ingredients yet.\n\n";

  return `You are helping a young player (around age 11) brainstorm a "${labels[slot]}" for a creative world-shaping game.

${context}Suggest 3 fresh, kid-friendly options for the ${slot}. Each option should be 4 to 12 words, vivid and specific, never bland. Mix tones: one cozy, one adventurous, one whimsical. Avoid violence, romance, brand names.

Respond ONLY with JSON in this exact shape, no preamble, no markdown:
{ "suggestions": ["option one", "option two", "option three"] }`;
}

function stripFences(raw: string): string {
  return raw.replace(/```json|```/g, "").trim();
}

function parseWorldResponse(raw: string): GeneratedWorld {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("World response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const title = requireString(obj.title, "title");
  const narration = requireString(obj.narration, "narration");
  const audio_prompt = requireString(obj.audio_prompt, "audio_prompt");
  const map = parseMap(obj.map);
  return { title, narration, map, audio_prompt };
}

function parseMap(raw: unknown): WorldMap {
  if (!raw || typeof raw !== "object") {
    throw new Error("map is not an object");
  }
  const m = raw as Record<string, unknown>;
  const background_color = requireHexColor(m.background_color);
  const terrain_paths = requireStringArray(m.terrain_paths, "terrain_paths");
  const character_emoji = requireSingleEmoji(m.character_emoji, "character_emoji");
  if (!Array.isArray(m.locations)) {
    throw new Error("locations is not an array");
  }
  if (m.locations.length < 3 || m.locations.length > 5) {
    throw new Error(`locations length ${m.locations.length} out of range`);
  }
  const locations = m.locations.map((loc, idx) => parseLocation(loc, idx));
  return { background_color, terrain_paths, locations, character_emoji };
}

function parseLocation(raw: unknown, idx: number): MapLocation {
  if (!raw || typeof raw !== "object") {
    throw new Error(`location ${idx} not an object`);
  }
  const l = raw as Record<string, unknown>;
  const id = requireString(l.id, `location[${idx}].id`);
  const name = requireString(l.name, `location[${idx}].name`);
  const description = requireString(l.description, `location[${idx}].description`);
  const icon = requireSingleEmoji(l.icon, `location[${idx}].icon`);
  const x = clampCoord(l.x);
  const y = clampCoord(l.y);
  return { id, name, description, icon, x, y };
}

function requireString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`${field} missing or not a string`);
  }
  return v.trim();
}

function requireStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw new Error(`${field} is not a string array`);
  }
  return v as string[];
}

function requireHexColor(v: unknown): string {
  if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) {
    throw new Error("background_color is not a 7-char hex");
  }
  return v;
}

function clampCoord(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) {
    throw new Error("coord is not a number");
  }
  return Math.max(5, Math.min(95, n));
}

function requireSingleEmoji(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`${field} missing`);
  }
  const trimmed = v.trim();
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const graphemes = Array.from(segmenter.segment(trimmed), (s) => s.segment);
  if (graphemes.length !== 1) {
    throw new Error(`${field} must be exactly one grapheme, got ${graphemes.length}`);
  }
  return graphemes[0];
}

function parseIdeasResponse(raw: string): string[] {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("ideas response not an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.suggestions)) {
    throw new Error("suggestions missing");
  }
  const filtered = obj.suggestions
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  if (filtered.length < 1) {
    throw new Error("no valid suggestions");
  }
  return filtered.slice(0, 3);
}

function defaultWorld(i: WorldIngredients): GeneratedWorld {
  return {
    title: "A Realm Half-Shaped",
    narration: `The Oracle's vision is hazy, but you can still glimpse a place where ${i.setting.toLowerCase()} stretches out and ${i.character.toLowerCase()} steps forward. Your goal: ${i.goal.toLowerCase()}. There is a twist: ${i.twist.toLowerCase()}.`,
    map: {
      background_color: "#1e293b",
      terrain_paths: ["M 10 60 Q 50 30 90 60 L 90 90 L 10 90 Z"],
      locations: [
        {
          id: "the_threshold",
          name: "The Threshold",
          x: 20,
          y: 50,
          icon: "🚪",
          description: "You arrive at a quiet doorway. The path begins here.",
        },
        {
          id: "the_clearing",
          name: "The Clearing",
          x: 50,
          y: 40,
          icon: "🌳",
          description: "A small clearing opens up. You catch your breath and listen.",
        },
        {
          id: "the_far_shore",
          name: "The Far Shore",
          x: 80,
          y: 60,
          icon: "✨",
          description: "You reach the far edge of the map. Something glimmers, waiting.",
        },
      ],
      character_emoji: "🧝",
    },
    audio_prompt: "soft wind, distant chimes, gentle ambient outdoors",
  };
}
