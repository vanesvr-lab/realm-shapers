import Anthropic from "@anthropic-ai/sdk";
import {
  ASSETS_BY_ID,
  BACKGROUND_IDS,
  CHARACTER_IDS,
  PROP_IDS,
  isValidBackgroundId,
  isValidCharacterId,
  isValidPropId,
} from "@/lib/asset-library";
import { matchSetting, type RankedBackground } from "@/lib/scene-matcher";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-opus-4-7";

export type WorldIngredients = {
  setting: string;
  character: string;
  // B-010: structured character carries the picker selection. Optional so old
  // worlds (free-text character) still load. When present, asset_id overrides
  // Claude's default_character_id pick, and name is mentioned in narration.
  character_asset_id?: string;
  character_name?: string;
  goal: string;
  twist: string;
};

export type IngredientSlot = "setting" | "character" | "goal" | "twist";

export type InteractableKind = "door" | "chest" | "path" | "sparkle" | "creature";

export const VALID_INTERACTABLE_KINDS: InteractableKind[] = [
  "door",
  "chest",
  "path",
  "sparkle",
  "creature",
];

export type StoryChoice = {
  id: string;
  label: string;
  next_scene_id: string;
  interactable_kind: InteractableKind;
  requires?: string[];
  // B-010 scope 8: one-sentence flavor hint shown when the kid first taps
  // this choice. Tone, not spoiler ("this path looks calm and quiet" not
  // "this path leads to the secret ending"). Optional for back-compat with
  // pre-B-010 worlds.
  hint?: string;
};

export type StoryFlag = {
  id: string;
  description: string;
};

export type StoryEnding = {
  scene_id: string;
  requires: Record<string, boolean>;
};

export type NarrationVariant = {
  when: Record<string, boolean>;
  text: string;
};

export type PropOverride = {
  when: Record<string, boolean>;
  props: string[];
};

export type ChoiceOption = {
  label: string;
  sets_flag: string;
  goes_to: string;
};

export type StoryScene = {
  id: string;
  title: string;
  narration: string;
  background_id: string;
  ambient_audio_prompt: string;
  default_props: string[];
  pickups: string[];
  choices: StoryChoice[];
  is_side_quest?: boolean;
  flag_set?: string;
  narration_variants?: NarrationVariant[];
  prop_overrides?: PropOverride[];
  is_choice_scene?: boolean;
  choice_options?: ChoiceOption[];
  // B-010: when the matched background catalog has no good fit for the kid's
  // setting input, Claude returns an inline SVG per scene as a fallback. When
  // present, renderers prefer this over the asset-library lookup.
  inline_svg?: string;
};

export type HeroLine = {
  kind: "thought" | "joke";
  text: string;
};

export type HeroVoiceName = "Fena" | "Ryan";

export type StoryTree = {
  title: string;
  starting_scene_id: string;
  default_character_id: string;
  scenes: StoryScene[];
  secret_ending?: StoryScene;
  // Required at generation time; optional on read because pre-B-009 worlds in
  // the DB do not have these fields. Resolver and selector treat undefined as
  // "no flags / no branching endings".
  flags?: StoryFlag[];
  endings?: StoryEnding[];
  // B-010 scope 7: difficulty level. 1 by default; 2+ for "Go Deeper"
  // regenerations. Drives the runtime 2-of-5 pickup completion gate.
  level?: number;
  // B-010 scope 9: clickable-hero lines (3-5 per realm) and the per-realm
  // hero voice (Fena for girl-coded, Ryan for boy-coded, Claude's pick
  // for neutrals). Optional for backwards compat with pre-B-010 worlds.
  hero_lines?: HeroLine[];
  hero_voice?: HeroVoiceName;
};

export type GeneratedWorld = {
  title: string;
  story: StoryTree;
};

export async function generateWorld(
  ingredients: WorldIngredients,
  level: number = 1
): Promise<GeneratedWorld> {
  const match = matchSetting(ingredients.setting);
  const requireInlineSvg = !match.hasGoodMatch;
  const buildPrompt = () => buildStoryPrompt(ingredients, match.ranked, requireInlineSvg, level);
  // Level 2+ trees are larger (10-12 scenes, 5 choices each); give Claude
  // more room. Keep level 1 at the existing 6144 budget.
  const maxTokens = level >= 2 ? 9216 : 6144;
  try {
    const text = await callClaude(buildPrompt(), maxTokens);
    const story = parseStoryResponse(text, ingredients, level);
    return { title: story.title, story };
  } catch (firstErr) {
    console.error("StoryTree generation failed once, retrying", firstErr);
    try {
      const text = await callClaude(buildPrompt(), maxTokens);
      const story = parseStoryResponse(text, ingredients, level);
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

export type PropAnimation = "wiggle" | "pulse" | "glow" | "open";

export type PropInteractionResult = {
  narration: string;
  animation: PropAnimation;
};

const VALID_PROP_ANIMATIONS: PropAnimation[] = ["wiggle", "pulse", "glow", "open"];

export async function generatePropInteraction(
  scene: StoryScene,
  propId: string,
  propAlt: string
): Promise<PropInteractionResult> {
  const prompt = buildPropInteractionPrompt(scene, propId, propAlt);
  const text = await callClaude(prompt, 256);
  return parsePropInteractionResponse(text);
}

function buildPropInteractionPrompt(scene: StoryScene, propId: string, propAlt: string): string {
  return `You are the Oracle in Realm Shapers. The young player (around age 11) just touched a "${propAlt}" (id: ${propId}) in a scene.

Scene title: ${scene.title}
Scene narration: ${scene.narration}
Background: ${scene.background_id}

Reply with a single warm, kid-friendly sentence (under 20 words) describing what happens when the player touches this object in this scene. Stay grounded in the scene tone. No violence, no scary content, no romance.

Pick exactly ONE animation that fits the reaction:
- "wiggle": object jiggles playfully
- "pulse": object thumps or breathes with light
- "glow": object brightens with magical light
- "open": object opens, unfurls, or reveals something

Respond ONLY with JSON in this exact shape, no preamble, no markdown, no code fences:
{ "narration": "your one sentence", "animation": "wiggle" | "pulse" | "glow" | "open" }`;
}

function parsePropInteractionResponse(raw: string): PropInteractionResult {
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("prop interaction response not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const narration = requireString(obj.narration, "narration");
  const anim = obj.animation;
  if (typeof anim !== "string" || !VALID_PROP_ANIMATIONS.includes(anim as PropAnimation)) {
    throw new Error(`invalid animation: ${String(anim)}`);
  }
  return { narration, animation: anim as PropAnimation };
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

function buildStoryPrompt(
  i: WorldIngredients,
  rankedBackgrounds: RankedBackground[],
  requireInlineSvg: boolean,
  level: number = 1
): string {
  const isDeep = level >= 2;
  const heroAssetId = i.character_asset_id && isValidCharacterId(i.character_asset_id)
    ? i.character_asset_id
    : null;
  const heroAsset = heroAssetId ? ASSETS_BY_ID[heroAssetId] : null;
  const heroNameLine = i.character_name?.trim()
    ? `Hero name (use in narration): ${i.character_name.trim()}`
    : "Hero is unnamed; refer to them generically.";
  const heroAssetLine = heroAsset
    ? `Hero asset (FIXED, picked by the kid): ${heroAsset.id} — ${heroAsset.alt}. Set "default_character_id" to "${heroAsset.id}" exactly. Do not substitute.`
    : `Hero asset will be picked from the curated character library.`;

  const rankedLine = rankedBackgrounds.length > 0
    ? rankedBackgrounds
        .map((r) => `${r.id} (${r.category}, score ${r.score.toFixed(2)})`)
        .join(", ")
    : "(no library match — use inline_svg fallback)";

  const backgroundInstructions = requireInlineSvg
    ? `BACKGROUND FALLBACK MODE. The kid's setting did not match any background in the library well enough. For EACH scene, you MUST set "inline_svg" to a small, hand-drawn-feeling SVG that fits the kid's setting input. The SVG must be a complete <svg> element with viewBox="0 0 1600 900", preserveAspectRatio="xMidYMid slice", soft watercolor-style colors, no text. Keep each SVG under 2000 characters. You may still set "background_id" to any valid library id as a graceful fallback for older clients, but the inline_svg is what the kid will see.`
    : `BACKGROUND PICKING MODE. The kid's setting matched the library well. For EACH scene, choose a "background_id" from the ranked list above (top match first, drift to lower-ranked options for variety across scenes if needed). Do NOT set "inline_svg". Background ids outside the ranked list are allowed only if a scene specifically calls for it (e.g. an indoor library scene inside an outdoor adventure), but prefer the ranked list.`;

  return `You are the Oracle in a creative game called Realm Shapers. A young player (around age 11) gives you four ingredients. You craft a longer point-and-click adventure for them where their choices matter.

Ingredients:
- Setting: ${i.setting}
- Character: ${i.character}
- Goal: ${i.goal}
- Twist: ${i.twist}

HERO LOCKED.
${heroAssetLine}
${heroNameLine}

BACKGROUNDS RANKED FOR THIS SETTING (top match first): ${rankedLine}

${backgroundInstructions}

${isDeep ? `THIS IS A "GO DEEPER" REGENERATION (level ${level}). The kid finished an earlier version of this realm and asked for a bigger, harder one. Make it richer than a normal realm. Same world, deeper.` : ""}

You must compose a branching story tree of ${isDeep ? "10 to 12" : "8 to 10"} scenes total:
- ${isDeep ? "7 to 9" : "5 to 7"} main path scenes that move toward 2 to 3 endings.
- 2 to 3 side quest scenes that branch off the main path. Each side quest scene MUST set "is_side_quest": true. A side quest gives the player a reward (a unique pickup or a special moment) and then either points back to the main path or leads to the secret ending.
- 2 to 3 of the scenes are endings: their "choices" array is empty.
${isDeep ? "- Every non-ending non-choice scene MUST have EXACTLY 5 outbound choices (instead of the usual 2-3). The kid wants more options to weigh.\n- The tree MUST contain at least 5 DISTINCT pickup ids across all scenes (instead of 3-5). The ending will be gated client-side behind 2 of those pickups, so the kid must hunt." : ""}

TREE SHAPE RULE (CRITICAL). Order the entries in the "scenes" array by narrative depth. The first two entries (index 0 and index 1) MUST be exploration / collect scenes that progress toward the goal. They MUST have non-empty "choices" and MUST NOT be endings or choice scenes. Ending scenes (choices: []) MUST appear at index 4 or later in the scenes array. This prevents a kid from accidentally finishing in 2 or 3 clicks before any choice has felt earned.

In play mode the kid clicks objects in each scene to advance. Each choice you write becomes a clickable interactable. Choose its kind from: "door", "chest", "path", "sparkle", "creature".

Pickups: some scenes give the player items via a "pickups" list. A later choice can require those items. Across the whole tree, 3 to 5 total pickups, at most 2 to 3 choices with a "requires" field.

PHANTOM-REQUIRES RULE (CRITICAL). Every item id you put inside a choice's "requires" array MUST also appear inside some scene's "pickups" array somewhere in this same tree. The kid must always be able to find every item the game asks for. If you cannot place a pickup, do not gate the choice on it. Trees that reference a required item with no matching pickup will be rejected and you will be asked to retry.

CONSEQUENCES (this is new). The kid's earlier actions ripple forward. You make this happen with named flags, narration variants, prop overrides, choice scenes, and conditional endings.

1. Define 3 to 5 named flags up front in the top-level "flags" array. Each flag is story-specific (snake_case id, e.g. "tamed_dragon", "helped_villager", "chose_secret_path"). Give each a one-sentence description. These are the only flag ids you may reference anywhere else.

2. Implicit flag setting. On 1 to 3 scenes (typically side quest scenes or scenes with a pickup), set "flag_set" to one of the flag ids. The flag fires silently when the kid leaves that scene.

3. Explicit choice scenes. Mark 1 to 2 mid or late scenes (NEVER the first scene, NEVER an ending) with "is_choice_scene": true. A choice scene's normal "choices" array MUST be empty. Instead it has "choice_options": exactly two entries, each with { "label": "2 to 6 words", "sets_flag": "<flag id>", "goes_to": "<scene id>" }. The two choice_options MUST set DIFFERENT flag ids and SHOULD route to different scenes when possible.

4. Narration variants. On 1 to 3 mid or late scenes, add "narration_variants": an ordered list of { "when": { "<flag_id>": true }, "text": "..." } entries. The first variant whose "when" all match the player's flag state wins; if none match, the base "narration" plays. Use these to acknowledge what the kid did earlier ("the dragon's kin greets you at the cave mouth").

5. Prop overrides. On up to 3 mid or late scenes (NEVER the first scene), add "prop_overrides": an ordered list of { "when": { "<flag_id>": true }, "props": [ "prop_id", ... ] }. Same matching rule. Replaces default_props when matched. Use this for visible scene changes (a broken bridge becomes a mended bridge by swapping props).

6. Endings. The top-level "endings" array is REQUIRED. 2 to 3 entries, RANKED. Each entry: { "scene_id": "<id of an ending scene>", "requires": { "<flag_id>": true | false } }. The first ending whose "requires" all match wins at finale. The LAST entry MUST have "requires": {} and acts as the fallback. Each scene_id in endings must point to a scene in "scenes" that has empty choices (i.e. an ending scene). The "starting_scene_id" routes only the opening; the ending is chosen at the end of play by flag state.

You must reference assets ONLY from the curated library below.

ALLOWED background_id values: ${BACKGROUND_IDS.join(", ")}

ALLOWED default_character_id values: ${CHARACTER_IDS.join(", ")}

ALLOWED prop ids (for default_props, pickups, prop_overrides arrays): ${PROP_IDS.join(", ")}

CLICKABLE HERO. Provide a top-level "hero_lines" array of 3 to 5 entries. Each entry is { "kind": "thought" | "joke", "text": "..." }. The kid taps their hero in any scene to hear one. Mix tones: some "thought" (in-character musing tied to the realm) and some "joke" (kid-friendly, age 11). Make at least one line reference the kid's setting or character specifically ("I never thought I would meet a real ${i.character}").

Provide a top-level "hero_voice" string, either "Fena" or "Ryan". Pick "Fena" for girl-coded characters (hero girl, princess, fairy, mermaid, witch). Pick "Ryan" for boy-coded characters (hero boy, knight, wizard, pirate, ninja). For animals, robots, aliens, dragons, and any neutral character, pick whichever fits the character's vibe; default to "Ryan" if truly ambiguous.

You must also write a "secret_ending" scene that is hidden from the normal choices. This becomes the player's true ending if they explore everything (visit all scenes or collect all pickups). Same shape as a normal ending scene (no choices). The secret ending is independent of the "endings" list above (which controls regular ending divergence by flag state).

Respond with ONLY JSON in EXACTLY this shape, no preamble, no markdown, no code fences:
{
  "title": "string, 2 to 6 words, evocative",
  "starting_scene_id": "snake_case_id_matching_one_scene",
  "default_character_id": "must be one of the allowed character ids",
  "hero_voice": "Fena | Ryan",
  "hero_lines": [
    { "kind": "thought", "text": "an in-character musing about this realm" },
    { "kind": "joke", "text": "a kid-friendly joke around age 11" }
  ],
  "flags": [
    { "id": "snake_case_flag_id", "description": "one short sentence about what setting this flag means" }
  ],
  "endings": [
    { "scene_id": "<id of an ending scene>", "requires": { "<flag_id>": true } },
    { "scene_id": "<id of fallback ending scene>", "requires": {} }
  ],
  "scenes": [
    {
      "id": "snake_case_id, unique",
      "title": "string, 2 to 5 words",
      "narration": "string, 1 to 3 sentences. Address the player as 'you'. Warm and magical, age-appropriate.",
      "background_id": "must be one of the allowed background ids OR a graceful fallback if you also provide inline_svg",
      "inline_svg": "OPTIONAL string. Only include in BACKGROUND FALLBACK MODE. Complete <svg viewBox=\"0 0 1600 900\" preserveAspectRatio=\"xMidYMid slice\"> ... </svg> element with watercolor-style color fills and no text. Under 2000 characters.",
      "ambient_audio_prompt": "5 to 12 words describing ambient sound only, never music or speech",
      "default_props": ["0 to 3 prop ids from the allowed list"],
      "pickups": ["0 to 2 prop ids from the allowed list, must NOT also appear in this scene's default_props"],
      "is_side_quest": false,
      "flag_set": "<optional, a flag id from the flags array>",
      "narration_variants": [
        { "when": { "<flag_id>": true }, "text": "alternate narration if these flags match" }
      ],
      "prop_overrides": [
        { "when": { "<flag_id>": true }, "props": ["prop_ids that replace default_props when matched"] }
      ],
      "is_choice_scene": false,
      "choice_options": [
        { "label": "first option text", "sets_flag": "<flag_id>", "goes_to": "<scene_id>" },
        { "label": "second option text", "sets_flag": "<other_flag_id>", "goes_to": "<scene_id>" }
      ],
      "choices": [
        {
          "id": "snake_case_id, unique within this scene",
          "label": "2 to 6 word kid-friendly button text",
          "next_scene_id": "id of another scene in this tree",
          "interactable_kind": "door | chest | path | sparkle | creature",
          "hint": "one short sentence describing the TONE of this path (NOT the consequence). Examples: 'this path looks calm and quiet' or 'something here hums with mischief'. Avoid spoilers like 'leads to the secret ending'.",
          "requires": ["optional, prop ids that must be collected first"]
        }
      ]
    }
  ],
  "secret_ending": {
    "id": "snake_case_id, unique, NOT one of the main scene ids",
    "title": "string, 2 to 5 words",
    "narration": "string, 2 to 3 sentences. Surprising and rewarding.",
    "background_id": "allowed background id",
    "ambient_audio_prompt": "5 to 12 words ambient",
    "default_props": ["0 to 3 prop ids"],
    "pickups": [],
    "is_side_quest": false,
    "choices": []
  }
}

Hard rules:
- scenes array MUST have between ${isDeep ? "10 and 12" : "8 and 10"} entries (inclusive).
- Exactly 2 or 3 of those scenes MUST have "is_side_quest": true. The rest MUST have "is_side_quest": false.
- starting_scene_id MUST match the id of one main (non side quest, non choice scene) scene at index 0 or index 1 in the scenes array.
- 2 to 3 of the scenes MUST be endings: their choices array is empty.
- Ending scenes (empty choices) MUST appear at index 4 or later in the scenes array. Indices 0-3 MUST NOT be endings.
- Indices 0 and 1 MUST NOT be choice scenes. They MUST have ${isDeep ? "exactly 5" : "2 or 3"} normal "choices".
- A non-ending, non-choice scene MUST have exactly ${isDeep ? "5" : "2 or 3"} normal "choices" entries.${isDeep ? "\n- The tree MUST contain at least 5 DISTINCT pickup ids across all scenes." : ""}
- A choice scene (is_choice_scene true) MUST have "choices": [] and exactly 2 "choice_options".
- An ending scene (no normal choices) MUST NOT also be a choice scene.
- A choice scene MUST NOT be the starting scene and MUST NOT be an ending.
- Every next_scene_id, every "goes_to" in choice_options, and every endings.scene_id MUST equal one of the scene ids in this tree.
- Every default_character_id and prop id MUST come from the allowed lists. No new ids, no synonyms.
- Each scene MUST have either a "background_id" from the allowed list OR a non-empty "inline_svg" string starting with "<svg". Both is fine; the renderer prefers inline_svg when present.
- Every interactable_kind MUST be one of: door, chest, path, sparkle, creature.
- Every "requires" entry, if present, MUST be a prop id that appears in some scene's pickups array.
- Every flag_set, every choice_options.sets_flag, every key in narration_variants.when, prop_overrides.when, and endings.requires MUST be a flag id defined in the top-level "flags" array.
- pickups for a single scene MUST NOT contain duplicates and must NOT include any id from that same scene's default_props.
- prop_overrides MUST NOT appear on the starting scene (kid would never see their composition).
- The "endings" array MUST have at least one entry whose "requires" is the empty object {}, AND that fallback MUST be the LAST entry.
- The secret_ending field is REQUIRED. Its id MUST be unique and MUST NOT match any of the main scene ids. Its choices array MUST be empty.
- Each side quest scene MUST be entered from at least one choice in a main path scene; that choice's interactable_kind should typically be "sparkle".
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

function parseStoryResponse(
  raw: string,
  ingredients?: WorldIngredients,
  level: number = 1
): StoryTree {
  const isDeep = level >= 2;
  const minScenes = isDeep ? 10 : 8;
  const maxScenes = isDeep ? 12 : 10;
  const requiredChoiceCount = isDeep ? 5 : null; // null = legacy 2-or-3
  const parsed = JSON.parse(stripFences(raw)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Story response is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const title = requireString(obj.title, "title");
  const starting_scene_id = requireString(obj.starting_scene_id, "starting_scene_id");
  let default_character_id = requireString(obj.default_character_id, "default_character_id");
  // B-010: the picker selection on the landing form is the source of truth.
  // Override Claude's pick with the kid's chosen asset_id so a "purple dragon"
  // pick can never silently fall back to "hero_girl" the way it did during
  // Kellen's playtest.
  if (
    ingredients?.character_asset_id &&
    isValidCharacterId(ingredients.character_asset_id)
  ) {
    default_character_id = ingredients.character_asset_id;
  }
  if (!isValidCharacterId(default_character_id)) {
    throw new Error(`default_character_id ${default_character_id} not in library`);
  }
  if (!Array.isArray(obj.scenes)) {
    throw new Error("scenes is not an array");
  }
  if (obj.scenes.length < minScenes || obj.scenes.length > maxScenes) {
    throw new Error(`scenes length ${obj.scenes.length} must be between ${minScenes} and ${maxScenes} (level ${level})`);
  }

  const flags = parseFlags(obj.flags);
  const flagIds = new Set(flags.map((f) => f.id));

  const scenes = obj.scenes.map((s, idx) => parseScene(s, idx, flagIds, requiredChoiceCount));
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
    if (scene.choice_options) {
      for (const co of scene.choice_options) {
        if (!ids.has(co.goes_to)) {
          throw new Error(
            `scene ${scene.id} choice_option goes_to ${co.goes_to} dangling`
          );
        }
      }
    }
  }
  const endingsCount = scenes.filter((s) => s.choices.length === 0 && !s.is_choice_scene).length;
  if (endingsCount < 2 || endingsCount > 3) {
    throw new Error(`ending scene count ${endingsCount} must be between 2 and 3`);
  }
  const sideQuestCount = scenes.filter((s) => s.is_side_quest).length;
  if (sideQuestCount < 2 || sideQuestCount > 3) {
    throw new Error(`side quest count ${sideQuestCount} must be between 2 and 3`);
  }
  const startingScene = scenes.find((s) => s.id === starting_scene_id);
  if (startingScene?.is_side_quest) {
    throw new Error("starting_scene_id must not be a side quest");
  }
  if (startingScene?.is_choice_scene) {
    throw new Error("starting_scene_id must not be a choice scene");
  }
  if (startingScene?.prop_overrides && startingScene.prop_overrides.length > 0) {
    throw new Error("starting scene must not have prop_overrides");
  }

  // B-010 scope 5: tree shape rule. Indices 0-3 must not be ending scenes,
  // and indices 0-1 must be regular non-choice non-ending scenes. Belt for
  // the runtime MIN_SCENES_BEFORE_ENDING gate in StoryPlayer.
  for (let idx = 0; idx < scenes.length; idx++) {
    const s = scenes[idx];
    const isEnding = s.choices.length === 0 && !s.is_choice_scene;
    if (idx <= 3 && isEnding) {
      throw new Error(
        `scene[${idx}] (${s.id}) is an ending but ending scenes must appear at index 4 or later`
      );
    }
    if (idx <= 1 && (s.is_choice_scene || s.choices.length === 0)) {
      throw new Error(
        `scene[${idx}] (${s.id}) must be a regular exploration scene (non-empty choices, not a choice scene)`
      );
    }
  }
  const startingIdx = scenes.findIndex((s) => s.id === starting_scene_id);
  if (startingIdx > 1) {
    throw new Error(
      `starting_scene_id ${starting_scene_id} must be at scene index 0 or 1, found at ${startingIdx}`
    );
  }

  // Choice scenes: must not be endings, must have exactly 2 choice_options.
  for (const s of scenes) {
    if (s.is_choice_scene) {
      if (s.choices.length !== 0) {
        throw new Error(`choice scene ${s.id} must have empty choices`);
      }
      if (!s.choice_options || s.choice_options.length !== 2) {
        throw new Error(`choice scene ${s.id} must have exactly 2 choice_options`);
      }
    }
  }

  const endings = parseEndings(obj.endings, ids, scenes, flagIds);

  let secret_ending: StoryScene | undefined;
  if (obj.secret_ending) {
    try {
      const parsed = parseScene(obj.secret_ending, 99, flagIds);
      if (ids.has(parsed.id)) {
        throw new Error("secret_ending id collides with main scene id");
      }
      if (parsed.choices.length !== 0) {
        throw new Error("secret_ending must have no choices");
      }
      secret_ending = parsed;
    } catch (err) {
      console.warn("secret_ending invalid, dropping:", err);
    }
  }

  // Phantom-requires hardening (B-010): every prop id referenced inside a
  // choice's "requires" array must also appear as a pickup somewhere in the
  // tree. Kellen's playtest 2026-04-26 surfaced two realms where Claude gated
  // a choice on an item that did not exist anywhere (hand mirror, brass key)
  // and stranded the player. Reject the tree so /api/generate retries.
  const allPickupIds = new Set<string>();
  for (const s of scenes) for (const p of s.pickups) allPickupIds.add(p);
  for (const s of scenes) {
    for (const c of s.choices) {
      if (c.requires) {
        const missing = c.requires.filter((r) => !allPickupIds.has(r));
        if (missing.length > 0) {
          throw new Error(
            `scene ${s.id} choice ${c.id} requires ${missing.join(", ")} which is not defined as a pickup anywhere in the tree`
          );
        }
      }
    }
  }

  // B-010 scope 7: Go Deeper trees gate the ending behind 2 of 5 distinct
  // pickups, so the parser requires the tree to define at least 5.
  if (isDeep && allPickupIds.size < 5) {
    throw new Error(
      `level ${level} tree must define at least 5 distinct pickups (got ${allPickupIds.size})`
    );
  }

  const hero_lines = parseHeroLines(obj.hero_lines);
  const hero_voice = parseHeroVoice(obj.hero_voice);

  return {
    title,
    starting_scene_id,
    default_character_id,
    scenes,
    secret_ending,
    flags,
    endings,
    level,
    hero_lines,
    hero_voice,
  };
}

function parseHeroLines(raw: unknown): HeroLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: HeroLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const kind = e.kind === "thought" || e.kind === "joke" ? e.kind : null;
    const text = typeof e.text === "string" ? e.text.trim() : "";
    if (!kind || !text) continue;
    out.push({ kind, text });
  }
  return out.length > 0 ? out.slice(0, 8) : undefined;
}

function parseHeroVoice(raw: unknown): HeroVoiceName | undefined {
  if (raw === "Fena" || raw === "Ryan") return raw;
  return undefined;
}

function parseFlags(raw: unknown): StoryFlag[] {
  if (!Array.isArray(raw)) {
    throw new Error("flags array is required");
  }
  if (raw.length < 3 || raw.length > 5) {
    throw new Error(`flags length ${raw.length} must be between 3 and 5`);
  }
  const out: StoryFlag[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const f = raw[i];
    if (!f || typeof f !== "object") throw new Error(`flags[${i}] not an object`);
    const fo = f as Record<string, unknown>;
    const id = requireString(fo.id, `flags[${i}].id`);
    const description = requireString(fo.description, `flags[${i}].description`);
    if (seen.has(id)) throw new Error(`duplicate flag id ${id}`);
    seen.add(id);
    out.push({ id, description });
  }
  return out;
}

function parseEndings(
  raw: unknown,
  sceneIds: Set<string>,
  scenes: StoryScene[],
  flagIds: Set<string>
): StoryEnding[] {
  if (!Array.isArray(raw)) {
    throw new Error("endings array is required");
  }
  if (raw.length < 2 || raw.length > 3) {
    throw new Error(`endings length ${raw.length} must be between 2 and 3`);
  }
  const endingSceneIds = new Set(
    scenes.filter((s) => s.choices.length === 0 && !s.is_choice_scene).map((s) => s.id)
  );
  const out: StoryEnding[] = [];
  for (let i = 0; i < raw.length; i++) {
    const e = raw[i];
    if (!e || typeof e !== "object") throw new Error(`endings[${i}] not an object`);
    const eo = e as Record<string, unknown>;
    const scene_id = requireString(eo.scene_id, `endings[${i}].scene_id`);
    if (!sceneIds.has(scene_id)) {
      throw new Error(`endings[${i}].scene_id ${scene_id} not in scenes`);
    }
    if (!endingSceneIds.has(scene_id)) {
      throw new Error(`endings[${i}].scene_id ${scene_id} is not an ending scene`);
    }
    const requires = parseFlagRecord(eo.requires, flagIds, `endings[${i}].requires`);
    out.push({ scene_id, requires });
  }
  // Last entry MUST be the fallback (empty requires).
  const last = out[out.length - 1];
  if (Object.keys(last.requires).length !== 0) {
    throw new Error("endings: last entry must be the fallback with empty requires");
  }
  return out;
}

function parseFlagRecord(
  raw: unknown,
  flagIds: Set<string>,
  field: string
): Record<string, boolean> {
  if (!raw || typeof raw !== "object") {
    throw new Error(`${field} must be an object`);
  }
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!flagIds.has(k)) {
      throw new Error(`${field} references unknown flag ${k}`);
    }
    if (typeof v !== "boolean") {
      throw new Error(`${field}.${k} must be boolean`);
    }
    out[k] = v;
  }
  return out;
}

function parseScene(
  raw: unknown,
  idx: number,
  flagIds?: Set<string>,
  requiredChoiceCount?: number | null
): StoryScene {
  if (!raw || typeof raw !== "object") {
    throw new Error(`scene ${idx} not an object`);
  }
  const s = raw as Record<string, unknown>;
  const id = requireString(s.id, `scene[${idx}].id`);
  const title = requireString(s.title, `scene[${idx}].title`);
  const narration = requireString(s.narration, `scene[${idx}].narration`);
  const background_id_raw = typeof s.background_id === "string" ? s.background_id.trim() : "";
  // B-010: scenes may either reference a library background_id OR provide a
  // hand-drawn inline_svg fallback. At least one must be valid.
  const inline_svg_raw = typeof s.inline_svg === "string" ? s.inline_svg.trim() : "";
  const hasValidBackground = background_id_raw && isValidBackgroundId(background_id_raw);
  const hasInlineSvg = inline_svg_raw.startsWith("<svg") && inline_svg_raw.length > 40;
  if (!hasValidBackground && !hasInlineSvg) {
    throw new Error(
      `scene[${idx}] needs either a valid background_id (got ${background_id_raw || "missing"}) or a non-empty inline_svg starting with <svg`
    );
  }
  const background_id = hasValidBackground ? background_id_raw : (BACKGROUND_IDS[0] ?? "forest");
  const ambient_audio_prompt = requireString(s.ambient_audio_prompt, `scene[${idx}].ambient_audio_prompt`);

  const default_props = parsePropList(s.default_props, 3);
  const pickups = parsePropList(s.pickups, 2).filter((p) => !default_props.includes(p));

  const choices_raw = Array.isArray(s.choices) ? s.choices : [];
  if (choices_raw.length !== 0) {
    // Choice scenes have empty choices; the choice scene parser path runs in
    // parseStoryResponse after this. For non-empty choices arrays:
    if (typeof requiredChoiceCount === "number") {
      if (choices_raw.length !== requiredChoiceCount) {
        throw new Error(
          `scene[${idx}] must have exactly ${requiredChoiceCount} choices (got ${choices_raw.length})`
        );
      }
    } else if (choices_raw.length < 2 || choices_raw.length > 3) {
      throw new Error(`scene[${idx}] must have 0, 2, or 3 choices`);
    }
  }
  const choices = choices_raw.map((c, ci) => parseChoice(c, idx, ci));
  const is_side_quest = s.is_side_quest === true;
  const is_choice_scene = s.is_choice_scene === true;

  const out: StoryScene = {
    id,
    title,
    narration,
    background_id,
    ambient_audio_prompt,
    default_props,
    pickups,
    choices,
    is_side_quest,
  };

  if (hasInlineSvg) {
    out.inline_svg = inline_svg_raw;
  }

  if (is_choice_scene) {
    out.is_choice_scene = true;
  }

  if (flagIds) {
    if (typeof s.flag_set === "string" && s.flag_set.trim()) {
      const fs = s.flag_set.trim();
      if (!flagIds.has(fs)) {
        throw new Error(`scene[${idx}].flag_set references unknown flag ${fs}`);
      }
      out.flag_set = fs;
    }

    if (Array.isArray(s.narration_variants) && s.narration_variants.length > 0) {
      const variants: NarrationVariant[] = [];
      for (let i = 0; i < s.narration_variants.length; i++) {
        const v = s.narration_variants[i];
        if (!v || typeof v !== "object") {
          throw new Error(`scene[${idx}].narration_variants[${i}] not an object`);
        }
        const vo = v as Record<string, unknown>;
        const when = parseFlagRecord(
          vo.when,
          flagIds,
          `scene[${idx}].narration_variants[${i}].when`
        );
        const text = requireString(vo.text, `scene[${idx}].narration_variants[${i}].text`);
        variants.push({ when, text });
      }
      out.narration_variants = variants;
    }

    if (Array.isArray(s.prop_overrides) && s.prop_overrides.length > 0) {
      const overrides: PropOverride[] = [];
      for (let i = 0; i < s.prop_overrides.length; i++) {
        const v = s.prop_overrides[i];
        if (!v || typeof v !== "object") {
          throw new Error(`scene[${idx}].prop_overrides[${i}] not an object`);
        }
        const vo = v as Record<string, unknown>;
        const when = parseFlagRecord(
          vo.when,
          flagIds,
          `scene[${idx}].prop_overrides[${i}].when`
        );
        const props = parsePropList(vo.props, 3);
        overrides.push({ when, props });
      }
      out.prop_overrides = overrides;
    }

    if (Array.isArray(s.choice_options) && s.choice_options.length > 0) {
      const options: ChoiceOption[] = [];
      for (let i = 0; i < s.choice_options.length; i++) {
        const c = s.choice_options[i];
        if (!c || typeof c !== "object") {
          throw new Error(`scene[${idx}].choice_options[${i}] not an object`);
        }
        const co = c as Record<string, unknown>;
        const label = requireString(co.label, `scene[${idx}].choice_options[${i}].label`);
        const sets_flag = requireString(
          co.sets_flag,
          `scene[${idx}].choice_options[${i}].sets_flag`
        );
        if (!flagIds.has(sets_flag)) {
          throw new Error(
            `scene[${idx}].choice_options[${i}].sets_flag references unknown flag ${sets_flag}`
          );
        }
        const goes_to = requireString(
          co.goes_to,
          `scene[${idx}].choice_options[${i}].goes_to`
        );
        options.push({ label, sets_flag, goes_to });
      }
      out.choice_options = options;
    }
  }

  return out;
}

function parsePropList(raw: unknown, max: number): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of arr) {
    if (typeof p !== "string") continue;
    if (!isValidPropId(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

function parseChoice(raw: unknown, sceneIdx: number, choiceIdx: number): StoryChoice {
  if (!raw || typeof raw !== "object") {
    throw new Error(`scene[${sceneIdx}] choice[${choiceIdx}] not an object`);
  }
  const c = raw as Record<string, unknown>;
  const id = requireString(c.id, `scene[${sceneIdx}] choice[${choiceIdx}].id`);
  const label = requireString(c.label, `scene[${sceneIdx}] choice[${choiceIdx}].label`);
  const next_scene_id = requireString(c.next_scene_id, `scene[${sceneIdx}] choice[${choiceIdx}].next_scene_id`);
  const kindRaw = c.interactable_kind;
  let interactable_kind: InteractableKind;
  if (typeof kindRaw === "string" && VALID_INTERACTABLE_KINDS.includes(kindRaw as InteractableKind)) {
    interactable_kind = kindRaw as InteractableKind;
  } else {
    interactable_kind = "path";
  }
  let requires: string[] | undefined;
  if (Array.isArray(c.requires)) {
    const filtered = c.requires.filter((r): r is string => typeof r === "string" && isValidPropId(r));
    if (filtered.length > 0) requires = Array.from(new Set(filtered));
  }
  let hint: string | undefined;
  if (typeof c.hint === "string" && c.hint.trim()) {
    hint = c.hint.trim();
  }
  const choice: StoryChoice = { id, label, next_scene_id, interactable_kind };
  if (requires) choice.requires = requires;
  if (hint) choice.hint = hint;
  return choice;
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

  const main: StoryScene[] = [
    {
      id: "threshold",
      title: "The Threshold",
      narration: `You arrive somewhere that feels like ${seedSetting}. The path forks ahead. Whatever is happening here, ${seedCharacter} is the one to face it.`,
      background_id: "forest",
      ambient_audio_prompt: "soft wind, distant chimes, gentle outdoor air",
      default_props: ["signpost", "lantern"],
      pickups: ["key"],
      is_side_quest: false,
      choices: [
        { id: "go_left", label: "Take the left path", next_scene_id: "clearing", interactable_kind: "path" },
        { id: "go_right", label: "Take the right path", next_scene_id: "cave_in", interactable_kind: "path" },
        { id: "follow_lantern", label: "Follow the dancing lantern", next_scene_id: "lantern_grove", interactable_kind: "sparkle" },
      ],
    },
    {
      id: "clearing",
      title: "The Clearing",
      narration: `You step into a quiet clearing. Your goal pulls you forward: ${seedGoal}. A small surprise waits, since ${seedTwist}.`,
      background_id: "garden",
      ambient_audio_prompt: "rustling leaves, soft birdsong, gentle wind",
      default_props: ["mushroom", "flower"],
      pickups: ["gem"],
      is_side_quest: false,
      choices: [
        { id: "rest", label: "Rest here", next_scene_id: "river_bend", interactable_kind: "sparkle" },
        { id: "press_on", label: "Press onward", next_scene_id: "ending_bright", interactable_kind: "door", requires: ["key"] },
      ],
    },
    {
      id: "cave_in",
      title: "Inside the Cave",
      narration: "You duck into a glowing cave. Crystals hum softly. Something here is paying attention.",
      background_id: "cave",
      ambient_audio_prompt: "soft cave drips, faint humming crystals",
      default_props: ["lantern"],
      pickups: [],
      is_side_quest: false,
      choices: [
        { id: "follow_glow", label: "Follow the glow", next_scene_id: "fountain_pool", interactable_kind: "sparkle" },
        { id: "turn_back", label: "Turn back", next_scene_id: "river_bend", interactable_kind: "path" },
      ],
    },
    {
      id: "river_bend",
      title: "The River Bend",
      narration: "A slow river wraps the path. The water hums an old, kind tune. The realm seems to pause for you.",
      background_id: "swamp",
      ambient_audio_prompt: "lapping water, soft frogs, gentle wind through reeds",
      default_props: ["bridge"],
      pickups: [],
      is_side_quest: false,
      choices: [
        { id: "cross", label: "Cross the bridge", next_scene_id: "ending_calm", interactable_kind: "path" },
        { id: "ending_grove", label: "Slip into the misty grove", next_scene_id: "ending_bright", interactable_kind: "door", requires: ["key"] },
      ],
    },
    {
      id: "ending_calm",
      title: "A Calm Ending",
      narration: "You take a slow breath. The realm settles around you. For now, your journey rests.",
      background_id: "garden",
      ambient_audio_prompt: "soft wind, faint chimes, calm outdoor air",
      default_props: ["flower"],
      pickups: [],
      is_side_quest: false,
      choices: [],
    },
    {
      id: "ending_bright",
      title: "A Bright Ending",
      narration: "Light wraps around you. The realm welcomes what you brought to it.",
      background_id: "sky_kingdom",
      ambient_audio_prompt: "soft chimes, distant bell tones, gentle airy whoosh",
      default_props: ["star"],
      pickups: [],
      is_side_quest: false,
      choices: [],
    },
    {
      id: "lantern_grove",
      title: "Lantern Grove",
      narration: "A tiny grove glows with floating lanterns. One drifts down and offers itself to you.",
      background_id: "forest",
      ambient_audio_prompt: "soft wind, distant chimes, faint warm crackle",
      default_props: ["lantern"],
      pickups: ["candle"],
      is_side_quest: true,
      choices: [
        { id: "back_to_path", label: "Return to the path", next_scene_id: "clearing", interactable_kind: "path" },
      ],
    },
    {
      id: "fountain_pool",
      title: "The Bright Fountain",
      narration: "Crystal water laughs in a tiny basin. A sparkle gathers itself for you, polite and patient.",
      background_id: "library",
      ambient_audio_prompt: "soft splashing water, faint ringing chimes",
      default_props: ["fountain"],
      pickups: ["star"],
      is_side_quest: true,
      choices: [
        { id: "back_to_cave", label: "Slip back into the cave", next_scene_id: "cave_in", interactable_kind: "path" },
      ],
    },
  ];

  const secret: StoryScene = {
    id: "ending_hidden",
    title: "A Hidden Ending",
    narration: "A door you never noticed opens. Beyond it, the realm whispers a thank you only you can hear.",
    background_id: "library",
    ambient_audio_prompt: "soft whispering pages, gentle distant chimes",
    default_props: ["scroll", "candle"],
    pickups: [],
    is_side_quest: false,
    choices: [],
  };

  const flags: StoryFlag[] = [
    { id: "took_lantern_path", description: "The kid followed the dancing lantern into the grove." },
    { id: "rested_at_river", description: "The kid paused at the river bend." },
    { id: "found_fountain_star", description: "The kid found the bright fountain's star." },
  ];

  const endings: StoryEnding[] = [
    { scene_id: "ending_bright", requires: { found_fountain_star: true } },
    { scene_id: "ending_calm", requires: {} },
  ];

  return {
    title: "A Realm Half-Shaped",
    starting_scene_id: "threshold",
    default_character_id: "hero_girl",
    scenes: main,
    secret_ending: secret,
    flags,
    endings,
  };
}

export { defaultStory };
