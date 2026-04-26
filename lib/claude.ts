import Anthropic from "@anthropic-ai/sdk";
import {
  BACKGROUND_IDS,
  CHARACTER_IDS,
  PROP_IDS,
  isValidBackgroundId,
  isValidCharacterId,
  isValidPropId,
} from "@/lib/asset-library";

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

export type IngredientSlot = "setting" | "character" | "goal" | "twist";

export type StoryChoice = {
  id: string;
  label: string;
  next_scene_id: string;
};

export type StoryScene = {
  id: string;
  title: string;
  narration: string;
  background_id: string;
  ambient_audio_prompt: string;
  default_props: string[];
  choices: StoryChoice[];
};

export type StoryTree = {
  title: string;
  starting_scene_id: string;
  default_character_id: string;
  scenes: StoryScene[];
};

export type GeneratedWorld = {
  title: string;
  story: StoryTree;
};

export async function generateWorld(
  ingredients: WorldIngredients
): Promise<GeneratedWorld> {
  try {
    const text = await callClaude(buildStoryPrompt(ingredients), 4096);
    const story = parseStoryResponse(text);
    return { title: story.title, story };
  } catch (firstErr) {
    console.error("StoryTree generation failed once, retrying", firstErr);
    try {
      const text = await callClaude(buildStoryPrompt(ingredients), 4096);
      const story = parseStoryResponse(text);
      return { title: story.title, story };
    } catch (secondErr) {
      console.error("StoryTree generation failed twice, using fallback", secondErr);
      const fallback = defaultStory(ingredients);
      return { title: fallback.title, story: fallback };
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

export async function rewriteSceneNarration(
  scene: StoryScene,
  composition: { character_id: string; prop_ids: string[] }
): Promise<string> {
  const prompt = buildSceneRewritePrompt(scene, composition);
  const text = await callClaude(prompt, 512);
  return parseSceneRewriteResponse(text);
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

function buildStoryPrompt(i: WorldIngredients): string {
  return `You are the Oracle in a creative game called Realm Shapers. A young player (around age 11) gives you four ingredients. You craft a small choose-your-own-adventure for them.

Ingredients:
- Setting: ${i.setting}
- Character: ${i.character}
- Goal: ${i.goal}
- Twist: ${i.twist}

You must compose a 5-scene branching story tree. The first scene is the start. There are 2 to 3 ending scenes (no choices). Every choice MUST point at one of the 5 scene ids you list. Every scene id MUST be a unique snake_case string.

You must reference assets ONLY from the curated library below. Do NOT invent new ids.

ALLOWED background_id values: ${BACKGROUND_IDS.join(", ")}

ALLOWED default_character_id values: ${CHARACTER_IDS.join(", ")}

ALLOWED prop ids (for default_props arrays): ${PROP_IDS.join(", ")}

Respond with ONLY JSON in EXACTLY this shape, no preamble, no markdown, no code fences:
{
  "title": "string, 2 to 6 words, evocative",
  "starting_scene_id": "snake_case_id_matching_one_scene",
  "default_character_id": "must be one of the allowed character ids",
  "scenes": [
    {
      "id": "snake_case_id, unique",
      "title": "string, 2 to 5 words",
      "narration": "string, 1 to 3 sentences. Address the player as 'you'. Warm and magical, age-appropriate.",
      "background_id": "must be one of the allowed background ids",
      "ambient_audio_prompt": "5 to 12 words describing ambient sound only, never music or speech",
      "default_props": ["0 to 3 prop ids from the allowed list"],
      "choices": [
        { "id": "snake_case_id, unique within this scene", "label": "2 to 6 word kid-friendly button text", "next_scene_id": "id of another scene in this tree" }
      ]
    }
  ]
}

Hard rules:
- scenes array MUST have exactly 5 entries.
- starting_scene_id MUST match the id of one of the 5 scenes.
- 2 or 3 of the 5 scenes MUST be endings: their choices array is empty.
- The other 2 or 3 scenes MUST have exactly 2 or 3 choices each.
- Every next_scene_id MUST equal one of the scene ids in this tree (no dangling references).
- Every background_id, default_character_id, and prop id MUST come from the allowed lists. No new ids, no synonyms.
- ambient_audio_prompt is for ElevenLabs Sound Effects, ambient only (waves, wind, rustling leaves, distant chimes), NEVER music or speech.
- Avoid violence, romance, brand names, scary content. The player is around 11.`;
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

function buildSceneRewritePrompt(
  scene: StoryScene,
  composition: { character_id: string; prop_ids: string[] }
): string {
  return `You are the Oracle in Realm Shapers. The player has rearranged a scene. Rewrite the narration to fit the new composition.

Current scene title: ${scene.title}
Background: ${scene.background_id}
Character on stage: ${composition.character_id}
Props the player placed: ${composition.prop_ids.length ? composition.prop_ids.join(", ") : "(none)"}

Original narration:
${scene.narration}

Rewrite the narration in 1 to 3 warm sentences that mention the props naturally if any are present, address the player as "you", and keep the same overall direction (so the choices that follow still make sense).

Respond ONLY with JSON in this exact shape, no preamble, no markdown:
{ "narration": "your rewrite" }`;
}

function stripFences(raw: string): string {
  return raw.replace(/```json|```/g, "").trim();
}

function parseStoryResponse(raw: string): StoryTree {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Story response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const title = requireString(obj.title, "title");
  const starting_scene_id = requireString(obj.starting_scene_id, "starting_scene_id");
  const default_character_id = requireString(obj.default_character_id, "default_character_id");
  if (!isValidCharacterId(default_character_id)) {
    throw new Error(`default_character_id ${default_character_id} not in library`);
  }
  if (!Array.isArray(obj.scenes)) {
    throw new Error("scenes is not an array");
  }
  if (obj.scenes.length !== 5) {
    throw new Error(`scenes length ${obj.scenes.length} must be 5`);
  }
  const scenes = obj.scenes.map((s, idx) => parseScene(s, idx));
  const ids = new Set(scenes.map((s) => s.id));
  if (ids.size !== scenes.length) {
    throw new Error("scene ids are not unique");
  }
  if (!ids.has(starting_scene_id)) {
    throw new Error(`starting_scene_id ${starting_scene_id} not in scenes`);
  }
  for (const scene of scenes) {
    for (const choice of scene.choices) {
      if (!ids.has(choice.next_scene_id)) {
        throw new Error(
          `scene ${scene.id} choice ${choice.id} next_scene_id ${choice.next_scene_id} dangling`
        );
      }
    }
  }
  const endings = scenes.filter((s) => s.choices.length === 0).length;
  if (endings < 1) {
    throw new Error("at least one ending scene required");
  }
  return { title, starting_scene_id, default_character_id, scenes };
}

function parseScene(raw: unknown, idx: number): StoryScene {
  if (!raw || typeof raw !== "object") {
    throw new Error(`scene ${idx} not an object`);
  }
  const s = raw as Record<string, unknown>;
  const id = requireString(s.id, `scene[${idx}].id`);
  const title = requireString(s.title, `scene[${idx}].title`);
  const narration = requireString(s.narration, `scene[${idx}].narration`);
  const background_id = requireString(s.background_id, `scene[${idx}].background_id`);
  if (!isValidBackgroundId(background_id)) {
    throw new Error(`scene[${idx}] background_id ${background_id} not in library`);
  }
  const ambient_audio_prompt = requireString(s.ambient_audio_prompt, `scene[${idx}].ambient_audio_prompt`);
  const default_props_raw = Array.isArray(s.default_props) ? s.default_props : [];
  const default_props: string[] = [];
  for (const p of default_props_raw) {
    if (typeof p !== "string") continue;
    if (!isValidPropId(p)) continue;
    default_props.push(p);
    if (default_props.length >= 3) break;
  }
  const choices_raw = Array.isArray(s.choices) ? s.choices : [];
  if (choices_raw.length !== 0 && (choices_raw.length < 2 || choices_raw.length > 3)) {
    throw new Error(`scene[${idx}] must have 0, 2, or 3 choices`);
  }
  const choices = choices_raw.map((c, ci) => parseChoice(c, idx, ci));
  return { id, title, narration, background_id, ambient_audio_prompt, default_props, choices };
}

function parseChoice(raw: unknown, sceneIdx: number, choiceIdx: number): StoryChoice {
  if (!raw || typeof raw !== "object") {
    throw new Error(`scene[${sceneIdx}] choice[${choiceIdx}] not an object`);
  }
  const c = raw as Record<string, unknown>;
  const id = requireString(c.id, `scene[${sceneIdx}] choice[${choiceIdx}].id`);
  const label = requireString(c.label, `scene[${sceneIdx}] choice[${choiceIdx}].label`);
  const next_scene_id = requireString(c.next_scene_id, `scene[${sceneIdx}] choice[${choiceIdx}].next_scene_id`);
  return { id, label, next_scene_id };
}

function requireString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`${field} missing or not a string`);
  }
  return v.trim();
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

function parseSceneRewriteResponse(raw: string): string {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("scene rewrite response not an object");
  }
  const obj = parsed as Record<string, unknown>;
  return requireString(obj.narration, "narration");
}

function defaultStory(i: WorldIngredients): StoryTree {
  const seedSetting = i.setting.toLowerCase();
  const seedCharacter = i.character.toLowerCase();
  const seedGoal = i.goal.toLowerCase();
  const seedTwist = i.twist.toLowerCase();

  return {
    title: "A Realm Half-Shaped",
    starting_scene_id: "threshold",
    default_character_id: "hero_girl",
    scenes: [
      {
        id: "threshold",
        title: "The Threshold",
        narration: `You arrive somewhere that feels like ${seedSetting}. The path forks ahead. Whatever is happening here, ${seedCharacter} is the one to face it.`,
        background_id: "forest",
        ambient_audio_prompt: "soft wind, distant chimes, gentle outdoor air",
        default_props: ["signpost", "lantern"],
        choices: [
          { id: "go_left", label: "Take the left path", next_scene_id: "clearing" },
          { id: "go_right", label: "Take the right path", next_scene_id: "cave_in" },
        ],
      },
      {
        id: "clearing",
        title: "The Clearing",
        narration: `You step into a quiet clearing. Your goal pulls you forward: ${seedGoal}. A small surprise waits, since ${seedTwist}.`,
        background_id: "garden",
        ambient_audio_prompt: "rustling leaves, soft birdsong, gentle wind",
        default_props: ["mushroom", "flower"],
        choices: [
          { id: "rest", label: "Rest here", next_scene_id: "ending_calm" },
          { id: "press_on", label: "Press onward", next_scene_id: "ending_bright" },
        ],
      },
      {
        id: "cave_in",
        title: "Inside the Cave",
        narration: "You duck into a glowing cave. Crystals hum softly. Something here is paying attention.",
        background_id: "cave",
        ambient_audio_prompt: "soft cave drips, faint humming crystals",
        default_props: ["gem", "lantern"],
        choices: [
          { id: "follow_glow", label: "Follow the glow", next_scene_id: "ending_bright" },
          { id: "turn_back", label: "Turn back", next_scene_id: "ending_calm" },
        ],
      },
      {
        id: "ending_calm",
        title: "A Calm Ending",
        narration: "You take a slow breath. The realm settles around you. For now, your journey rests.",
        background_id: "garden",
        ambient_audio_prompt: "soft wind, faint chimes, calm outdoor air",
        default_props: ["flower"],
        choices: [],
      },
      {
        id: "ending_bright",
        title: "A Bright Ending",
        narration: "Light wraps around you. The realm welcomes what you brought to it.",
        background_id: "sky_kingdom",
        ambient_audio_prompt: "soft chimes, distant bell tones, gentle airy whoosh",
        default_props: ["star"],
        choices: [],
      },
    ],
  };
}

export { defaultStory };
