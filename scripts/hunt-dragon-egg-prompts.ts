// Hunt the Dragon's Egg, image prompts. Single source of truth for both
// manual generation (open this file, copy a prompt into Midjourney/Imagen/
// DALL-E, save the output to the target path) and the auto-generation script
// scripts/generate-hunt-dragon-egg-art.ts (imports the array, calls Replicate
// Flux 1.1 Pro for each entry, writes the webp to the target path).
//
// Style is the same painterly storybook palette used by B-013 pilot art so
// the new adventure visually fits with the existing castle drawbridge,
// wizard, and pickup icons.

const STYLE =
  "painterly fantasy storybook art, soft lighting, vibrant kid-friendly colors, no text or watermarks";

export type ImageJob = {
  id: string;
  outDir: string;
  filename: string;
  aspect: "16:9" | "1:1";
  prompt: string;
};

export const HUNT_DRAGON_EGG_JOBS: ImageJob[] = [
  // ---------- New scene backgrounds (challenge expansion) ----------
  {
    id: "forest_riddle",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "forest_riddle.webp",
    aspect: "16:9",
    prompt: `An ancient oak tree blocks a forest path, with an old wise face formed naturally in its bark, eyes half open as if speaking, dappled sunlight, golden hour, no figures, sense of magic and challenge, ${STYLE}.`,
  },
  {
    id: "wood_gathering",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "wood_gathering.webp",
    aspect: "16:9",
    prompt: `A long fallen pine tree lying across a forest trail, sun-dappled bark, dry needles around it, ready to be chopped into logs, no figures, sense of useful resource waiting, ${STYLE}.`,
  },
  {
    id: "river_crossing",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "river_crossing.webp",
    aspect: "16:9",
    prompt: `A wide slow forest river under a soft sky, the smoking volcano visible on the far bank in the distance, no bridge, the near shore has tall grass and reeds, no figures, sense of barrier needing to be solved, ${STYLE}.`,
  },
  {
    id: "dark_cavern",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "dark_cavern.webp",
    aspect: "16:9",
    prompt: `The mouth of a deep cave at the base of a volcanic cliff, the inside fading into pitch black darkness, hints of rocks just visible at the edge, no figures, eerie hush, ${STYLE}.`,
  },
  {
    id: "lava_river_crossing",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "lava_river_crossing.webp",
    aspect: "16:9",
    prompt: `A slow river of bright orange lava flowing across a rocky path, with several jagged cooled obsidian rocks jutting up from the lava, hot air shimmer above, dark stone walls, no figures, sense of dangerous puzzle, ${STYLE}.`,
  },

  // ---------- Existing scene backgrounds ----------
  {
    id: "prologue_courtyard",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "prologue_courtyard.webp",
    aspect: "16:9",
    prompt: `A young wizard standing alone at a small back gate of a stone castle at dawn, a worn travel pack at his feet, simple traveler robes, an old hooded Oracle in a long coat standing nearby, peaceful courtyard with cobblestones and ivy, soft pink and pale blue sky, dewy grass, ${STYLE}.`,
  },
  {
    id: "forest_path",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "forest_path.webp",
    aspect: "16:9",
    prompt: `A sunlit forest path forking ahead through tall friendly trees, golden hour light streaming between leaves, a distant smoking volcano on the horizon visible through the trees, dappled light on a mossy path, no figures, calm and inviting, ${STYLE}.`,
  },
  {
    id: "cliff_climb",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "cliff_climb.webp",
    aspect: "16:9",
    prompt: `A sheer rocky cliff face seen from below, tall and sunlit, a sturdy rope anchor pegged at the top with a brown rope hanging down, wind blown grass at the base, distant blue mountains, no figures, sense of upward challenge, ${STYLE}.`,
  },
  {
    id: "riverbank",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "riverbank.webp",
    aspect: "16:9",
    prompt: `A clear bend in a forest river with mossy rocks and dappled sunlight on the water, a small woven reed fish trap at the water's edge, a half buried scroll partially visible on the bank under a stone, lush ferns, calm restful place, no figures, gentle ripples, ${STYLE}.`,
  },
  {
    id: "volcano_base",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "volcano_base.webp",
    aspect: "16:9",
    prompt: `A massive smoking volcanic cone filling the frame with three visible paths winding up its slopes, one through steam vents and vines, one entering a dark cave mouth, one curving around the back into deeper ash, ash grey sky with hints of orange, a wrecked traveller's pack near a cold campfire to one side, sense of awe and danger, no figures, ${STYLE}.`,
  },
  {
    id: "volcano_base_speaks",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "volcano_base_speaks.webp",
    aspect: "16:9",
    prompt: `Same massive smoking volcanic cone with three paths visible, but now a single huge stone eye has cracked open in the rockface and is glowing red from within, looking outward, fractured glowing rocks around the eye, ash sky tinted ominous orange, a sense the mountain is alive and watching, no figures, ${STYLE}.`,
  },
  {
    id: "lava_chamber",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "lava_chamber.webp",
    aspect: "16:9",
    prompt: `Inside a vast volcanic cavern, streams of bright orange lava flowing through black obsidian channels, a passage ahead blocked by tangled hardened lava vines, hot air shimmer, glowing red light from below, no figures, dangerous and dramatic, ${STYLE}.`,
  },
  {
    id: "cave_shortcut",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "cave_shortcut.webp",
    aspect: "16:9",
    prompt: `A quiet bioluminescent cave interior, walls glowing with soft blue and teal mushrooms and lichens, a small abandoned campsite with a cold fire ring and a packet of supplies on a flat rock, gentle stalactites overhead, peaceful dreamlike light, calm refuge, no figures, ${STYLE}.`,
  },
  {
    id: "dragon_chamber",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "dragon_chamber.webp",
    aspect: "16:9",
    prompt: `A vast nesting cavern with a huge mother dragon coiled around a single softly glowing dragon egg, the dragon's eyes half open and watchful, ancient and majestic with iridescent scales, the cavern lit by the egg's warm golden glow and faint volcanic light from above, awe and tension, no human figures, ${STYLE}.`,
  },
  {
    id: "dragon_chamber_wounded",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "dragon_chamber_wounded.webp",
    aspect: "16:9",
    prompt: `Same vast nesting cavern with the mother dragon coiled around her softly glowing dragon egg, but now a long jagged scar visible along her flank, her breath slow and labored, eyes weary but still watchful, the egg pulsing softly between her claws, soft golden light, vulnerability beneath the danger, no human figures, ${STYLE}.`,
  },
  {
    id: "dragon_chamber_calm",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "dragon_chamber_calm.webp",
    aspect: "16:9",
    prompt: `Same vast nesting cavern with the mother dragon, but now her body relaxed, her head lowered in trust, eyes nearly closed, the glowing dragon egg held gently between her front claws, golden light deeper and warmer, a peaceful moment of connection, no human figures, ${STYLE}.`,
  },

  // ---------- Variants for narration shifts ----------
  {
    id: "forest_path_hungry",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "forest_path_hungry.webp",
    aspect: "16:9",
    prompt: `Same sunlit forest path forking ahead with a distant volcano on the horizon, but now the colors slightly muted and washed out, the trees feeling longer and more daunting, a hint of dusk creeping in, the path looking wearier, no figures, sense of fatigue and hunger, ${STYLE}.`,
  },
  {
    id: "volcano_base_thirsty",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "volcano_base_thirsty.webp",
    aspect: "16:9",
    prompt: `Same massive smoking volcano cone with three paths up, but the sky is hot and red, the air visibly shimmering with heat, the ground cracked and dust blown, no figures, sense of dryness and exhaustion, ${STYLE}.`,
  },

  // ---------- Endings ----------
  {
    id: "ending_starvation",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_starvation.webp",
    aspect: "16:9",
    prompt: `A small wizard figure resting gently on a volcanic slope at dusk, an empty pack beside him, the volcano peaceful in the distance, cool fading purple sky, soft watercolor sense of quiet sleep rather than horror, kid appropriate sense of resting too long, ${STYLE}.`,
  },
  {
    id: "ending_dehydration",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_dehydration.webp",
    aspect: "16:9",
    prompt: `A small wizard figure kneeling at a cracked dry spring at sunset, an empty water bottle beside him, parched red landscape, distant volcano, kid friendly storybook feel of a journey gone too far without water, gentle and sad rather than horrific, ${STYLE}.`,
  },
  {
    id: "ending_lost",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_lost.webp",
    aspect: "16:9",
    prompt: `A small wizard figure walking into deep ash drifts under a grey ash sky, his footprints stretching back behind him, the silhouette of the volcano behind, lonely and quiet, the wizard small against vast emptiness, gentle melancholy, ${STYLE}.`,
  },
  {
    id: "ending_friend",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_friend.webp",
    aspect: "16:9",
    prompt: `The wizard walking back toward a distant castle in golden afternoon light with a softly glowing dragon egg cradled carefully in his hands, the mother dragon flying overhead in a graceful protective arc, sun rays through clouds, warm and triumphant, sense of true friendship and partnership, ${STYLE}.`,
  },
  {
    id: "ending_charmed",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_charmed.webp",
    aspect: "16:9",
    prompt: `The wizard at a castle gate at peaceful dawn, the glowing dragon egg cradled in his hands, soft pink and gold sky, on the distant mountain the mother dragon visibly sleeping curled around herself, a gentle quiet ending, hopeful and calm, ${STYLE}.`,
  },
  {
    id: "ending_appeased",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_appeased.webp",
    aspect: "16:9",
    prompt: `The wizard at a castle gate at dusk, the glowing dragon egg held in both hands, the volcano peaceful on the horizon with no smoke, soft purple and rose sky, the wizard looks tired but satisfied, sense of quiet earned victory, ${STYLE}.`,
  },
  {
    id: "ending_success",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_success.webp",
    aspect: "16:9",
    prompt: `The wizard at a castle gate panting, the dragon egg clutched tight, distant smoke rising from the volcano with a hint of a roar in the air, fading orange sunset, breathless triumph but with tension, the kingdom safe but the dragon watchful, ${STYLE}.`,
  },
  {
    id: "ending_secret",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "ending_secret.webp",
    aspect: "16:9",
    prompt: `The wizard sitting before a cozy castle hearth at night, a tiny baby dragon hatching from a glowing egg in his lap, the baby's eyes just opening, warm firelight, soft browns and golds, a magical heartwarming moment of new life, ${STYLE}.`,
  },

  // ---------- B-014 economy expansion scenes ----------
  {
    id: "wolf_encounter",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "wolf_encounter.webp",
    aspect: "16:9",
    prompt: `A gray wolf blocking a narrow rocky cliff ledge, snow-capped mountains and distant volcano on the horizon, the wolf's yellow eyes alert, lip lifted to show teeth in a tense standoff, no people, sense of dangerous puzzle, ${STYLE}.`,
  },
  {
    id: "waterfall_climb",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "waterfall_climb.webp",
    aspect: "16:9",
    prompt: `A cascading forest waterfall on a high cliff, golden mist rising from the bottom, a small wooden treasure chest with brass clasps half hidden behind a curtain of moss at the top, lush ferns, no people, sense of hidden reward, ${STYLE}.`,
  },
  {
    id: "eagle_nest",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "eagle_nest.webp",
    aspect: "16:9",
    prompt: `A high cliff edge with a great woven stick nest, pale eggs nestled inside next to a glittering pile of gold coins and shells, the smoking volcano visible in the far distance under a wide sky, no people, no eagle in frame, sense of risky treasure, ${STYLE}.`,
  },
  {
    id: "bone_field",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "bone_field.webp",
    aspect: "16:9",
    prompt: `Old skeletons of past adventurers scattered on volcanic ash slopes, helmets and ribcages half-buried, drifting ash, a single bright gemstone glinting among the bones, ash-grey sky tinted orange near the horizon, no people, gentle sense of warning rather than horror, kid-friendly storybook tone, ${STYLE}.`,
  },
  {
    id: "crystal_chamber",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "crystal_chamber.webp",
    aspect: "16:9",
    prompt: `A bioluminescent cave alcove full of clustered glowing blue and white crystals along the walls, in the center of the chamber a single warm-glowing amber crystal sits on a small ledge, soft mist, peaceful magical atmosphere, no people, ${STYLE}.`,
  },
  {
    id: "dragon_cubs",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "dragon_cubs.webp",
    aspect: "16:9",
    prompt: `Two small playful dragon cubs tumbling in a rocky antechamber outside a larger glowing cavern, glowing iridescent scales, the ribcage of an old beast resting in the background, faint warm light from deeper in the cave, no people, sense of cute danger, ${STYLE}.`,
  },
  {
    id: "shrine",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "shrine.webp",
    aspect: "16:9",
    prompt: `A small ancient stone shrine in a quiet forest clearing, mossy carvings on its weathered stones, a shallow offering bowl in the center, old candles flickering at its base, soft afternoon sunlight streaming through the trees, no people, peaceful and inviting, ${STYLE}.`,
  },
  {
    id: "thief_encounter",
    outDir: "public/adventures/hunt-dragon-egg",
    filename: "thief_encounter.webp",
    aspect: "16:9",
    prompt: `A hooded traveler in a long dusty cloak standing alone on a hot dry ash road, face hidden in shadow, hand resting easy on a curved knife at the hip, ash drifting in the air, the smoking volcano visible in the distance, no other figures, sense of quiet menace and choice, kid-appropriate storybook tone, ${STYLE}.`,
  },

  // ---------- B-014 economy pickup icons ----------
  {
    id: "coin_pouch",
    outDir: "public/pickups",
    filename: "coin_pouch.webp",
    aspect: "1:1",
    prompt: `a small leather drawstring pouch overflowing with shiny gold coins, a few coins spilled around the base, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "treasure_chest",
    outDir: "public/pickups",
    filename: "treasure_chest.webp",
    aspect: "1:1",
    prompt: `a small wooden chest with brass corners and an open lid revealing piles of gold coins, soft golden glow rising from inside, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "rare_gem",
    outDir: "public/pickups",
    filename: "rare_gem.webp",
    aspect: "1:1",
    prompt: `a single flawless cut gemstone glowing softly with inner light, light teal-amber color, faceted and clear, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "glowstone",
    outDir: "public/pickups",
    filename: "glowstone.webp",
    aspect: "1:1",
    prompt: `a smooth round crystal stone glowing with steady warm amber light from within, polished surface, isolated on a clean pale background, ${STYLE}.`,
  },

  // ---------- Pickup icons ----------
  {
    id: "sword",
    outDir: "public/pickups",
    filename: "sword.webp",
    aspect: "1:1",
    prompt: `a simple wizard's sword with a softly glowing crystal pommel, leather wrapped grip, slender silver blade, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "water_bottle",
    outDir: "public/pickups",
    filename: "water_bottle.webp",
    aspect: "1:1",
    prompt: `a small leather water bottle with a wooden cork stopper, a faint blue glow at its lip suggesting fresh water, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "food_ration",
    outDir: "public/pickups",
    filename: "food_ration.webp",
    aspect: "1:1",
    prompt: `a small bundle of trail rations wrapped in brown paper and tied with twine, a piece of dried bread and some berries visible, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "lantern",
    outDir: "public/pickups",
    filename: "lantern.webp",
    aspect: "1:1",
    prompt: `a small storm lantern with a warm orange flame inside glass panes, brass frame, a hanging hook on top, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "tarnished_medallion",
    outDir: "public/pickups",
    filename: "tarnished_medallion.webp",
    aspect: "1:1",
    prompt: `an old tarnished bronze medallion with worn engravings of a tower, slightly chipped, hanging from a thin worn cord, isolated on a clean pale background, ${STYLE}.`,
  },
  {
    id: "wood_logs",
    outDir: "public/pickups",
    filename: "wood_logs.webp",
    aspect: "1:1",
    prompt: `a small bundle of three straight pine logs tied with a length of twine, light bark, fresh chop marks, isolated on a clean pale background, ${STYLE}.`,
  },
];
