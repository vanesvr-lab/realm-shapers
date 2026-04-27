import { NextRequest, NextResponse } from "next/server";
import { generateWorld, generateWorldShell, WorldIngredients } from "@/lib/claude";
import { serverSupabase } from "@/lib/supabase-server";
import {
  THEMES_BY_ID,
  isValidThemeId,
  isValidSubSceneId,
  getSubScene,
} from "@/lib/themes-catalog";
import { CHARACTERS_BY_ID } from "@/lib/characters-catalog";

// B-011 scope 5: /api/generate accepts two payload shapes.
//
// New (theme-driven, sent by the rewritten LandingForm):
//   { theme, entry_sub_scene_id, character_id, character_name?, goal, twist,
//     progressive? }
//   - theme + entry_sub_scene_id + character_id are validated against the
//     catalogs in lib/themes-catalog.ts and lib/characters-catalog.ts.
//   - The picked theme's full sub-scene list is passed to claude.ts via
//     ingredients.theme_id; claude.ts then injects the catalog block into
//     the story prompt, locks scene 1 to entry_sub_scene_id, enforces
//     adjacency for scenes 2-4, and resolves hero_voice from the catalog.
//   - The theme id is also saved on worlds.theme for renderer routing.
//
// Legacy (free-text setting + free-text character, sent by callers older
// than B-011):
//   { setting, character, character_asset_id?, character_name?, goal,
//     twist, progressive? }
//   - Coerced to no-theme + matcher fallback path internally. worlds.theme
//     stays null. Pre-B-011 worlds in the DB also load through this path.

type NewBody = {
  theme: string;
  entry_sub_scene_id: string;
  character_id: string;
  character_name?: string;
  goal: string;
  twist: string;
  progressive?: boolean;
};

type LegacyBody = WorldIngredients & { progressive?: boolean };

type GenerateBody = Partial<NewBody> & Partial<LegacyBody>;

function isNewShape(body: GenerateBody): boolean {
  return typeof body.theme === "string" && typeof body.entry_sub_scene_id === "string";
}

export async function POST(req: NextRequest) {
  const supabase = serverSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as GenerateBody;

    let ingredients: WorldIngredients;
    let themeColumn: string | null;

    if (isNewShape(body)) {
      const themeId = String(body.theme);
      const entrySubSceneId = String(body.entry_sub_scene_id);
      const characterId = String(body.character_id ?? "");
      const goal = (body.goal ?? "").trim();
      const twist = (body.twist ?? "").trim();
      const characterName = body.character_name?.trim();

      if (!isValidThemeId(themeId)) {
        return NextResponse.json({ error: `Unknown theme: ${themeId}` }, { status: 400 });
      }
      const theme = THEMES_BY_ID[themeId];
      if (!isValidSubSceneId(entrySubSceneId)) {
        return NextResponse.json(
          { error: `Unknown sub-scene: ${entrySubSceneId}` },
          { status: 400 }
        );
      }
      const subScene = getSubScene(entrySubSceneId);
      if (!subScene || subScene.theme !== themeId) {
        return NextResponse.json(
          { error: `Sub-scene ${entrySubSceneId} does not belong to theme ${themeId}` },
          { status: 400 }
        );
      }
      const character = CHARACTERS_BY_ID[characterId];
      if (!character) {
        return NextResponse.json(
          { error: `Unknown character: ${characterId}` },
          { status: 400 }
        );
      }
      if (!goal || !twist) {
        return NextResponse.json({ error: "Goal and twist required" }, { status: 400 });
      }

      // Compose human-readable setting + character strings so the existing
      // prompt phrasing (which treats setting/character as plain prose) still
      // reads naturally. The catalog ids carry the structured truth via the
      // new theme_id / entry_sub_scene_id / character_id fields.
      const settingText = `${subScene.label} in the ${theme.label} world (${subScene.description})`;
      const characterText = characterName
        ? `${characterName}, the ${character.label.toLowerCase()}`
        : /^[aeiou]/i.test(character.label)
        ? `an ${character.label.toLowerCase()}`
        : `a ${character.label.toLowerCase()}`;

      ingredients = {
        setting: settingText,
        character: characterText,
        // B-010 picker asset_id wiring: catalog characters often share their
        // id with the asset library (knight, wizard, etc). Pass the catalog
        // id through; claude.ts validates against the asset library and
        // falls back gracefully if there is no asset match.
        character_asset_id: character.id,
        character_name: characterName,
        goal,
        twist,
        theme_id: themeId,
        entry_sub_scene_id: entrySubSceneId,
        character_id: characterId,
      };
      themeColumn = themeId;
    } else {
      const legacy = body as LegacyBody;
      if (!legacy.setting || !legacy.character || !legacy.goal || !legacy.twist) {
        return NextResponse.json(
          { error: "All four ingredients required" },
          { status: 400 }
        );
      }
      ingredients = {
        setting: legacy.setting,
        character: legacy.character,
        character_asset_id: legacy.character_asset_id,
        character_name: legacy.character_name,
        goal: legacy.goal,
        twist: legacy.twist,
      };
      themeColumn = null;
    }

    // B-010 scope 10: progressive returns a placeholder shell instantly so
    // the kid sees scene 1 in under a second. PlayClient kicks off
    // /api/finalize to swap the real tree in.
    const progressive = body.progressive === true;
    const world = progressive
      ? generateWorldShell(ingredients)
      : await generateWorld(ingredients);
    const startingScene = world.story.scenes.find(
      (s) => s.id === world.story.starting_scene_id
    );
    const narration = startingScene?.narration ?? "";
    const audioPrompt = startingScene?.ambient_audio_prompt ?? "soft wind, gentle outdoor air";

    const { data: row, error } = await supabase
      .from("worlds")
      .insert({
        user_id: user.id,
        title: world.title,
        narration,
        ingredients,
        map: world.story,
        audio_prompt: audioPrompt,
        generation_status: progressive ? "phase_1" : "complete",
        theme: themeColumn,
      })
      .select("id, share_slug")
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: "Failed to save world: " + (error?.message ?? "unknown") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: world.title,
      story: world.story,
      id: row.id,
      share_slug: row.share_slug,
      unlocked: [],
      generation_status: progressive ? "phase_1" : "complete",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
