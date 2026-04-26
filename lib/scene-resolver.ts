import type { ChoiceOption, StoryEnding, StoryScene } from "@/lib/claude";
import { matchesWhen, pickVariant, type FlagState } from "@/lib/flags";

export type ResolvedScene = {
  narration: string;
  props: string[];
  choice_options: ChoiceOption[] | undefined;
};

// Given a scene and the kid's current flag state, return what should actually
// render. First matching narration_variant wins; falls through to base
// narration. Same rule for prop_overrides; falls through to default_props.
export function resolveScene(scene: StoryScene, flags: FlagState): ResolvedScene {
  const variant = pickVariant(scene.narration_variants, flags, null);
  const narration = variant ? variant.text : scene.narration;

  const override = pickVariant(scene.prop_overrides, flags, null);
  const props = override ? override.props : scene.default_props;

  return {
    narration,
    props,
    choice_options: scene.is_choice_scene ? scene.choice_options : undefined,
  };
}

// Pick the winning ending scene_id given the kid's flag state. Endings are
// ranked: first whose `requires` all match wins. Last entry must have empty
// requires (parser enforces that at generation), so this always returns a
// scene id when the tree is well-formed. Returns null if endings is missing
// or empty (pre-B-009 worlds).
export function selectEnding(
  endings: StoryEnding[] | undefined,
  flags: FlagState
): string | null {
  if (!endings || endings.length === 0) return null;
  for (const e of endings) {
    if (matchesWhen(e.requires, flags)) return e.scene_id;
  }
  return endings[endings.length - 1].scene_id;
}
