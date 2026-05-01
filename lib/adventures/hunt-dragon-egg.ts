// Hunt the Dragon's Egg, hand-authored adventure. Bypasses Claude entirely.
// /api/generate?adventure_id=hunt-dragon-egg loads this tree directly,
// saves to worlds.map, and PlayClient renders it through the same path
// Claude-generated worlds use plus the new prologue / counter / starter
// flow that triggers when story.prologue is present.
//
// Flow: prologue (Oracle dialogue + starter pick, handled in PlayClient)
//   -> forest_path -> cliff_climb OR riverbank -> volcano_base
//   -> lava_chamber OR cave_shortcut -> dragon_chamber -> ending
//
// Endings (ranked, first match wins per scene-resolver.ts:32-41):
//   ending_starvation, ending_dehydration, ending_lost, ending_friend,
//   ending_charmed, ending_appeased (two requires entries: tended OR
//   kneeled), ending_success (fallback). Plus secret_ending (kid hatches
//   the egg at home; reuses existing secretEligible heuristic).

import type { Adventure } from "@/lib/adventures/types";
import type { StoryTree, StoryScene } from "@/lib/claude";

// --- ids in one place so typos are caught at type level. ---

const SCENE = {
  forest_riddle: "forest_riddle",
  forest_path: "forest_path",
  cliff_climb: "cliff_climb",
  riverbank: "riverbank",
  wood_gathering: "wood_gathering",
  river_crossing: "river_crossing",
  volcano_base: "volcano_base",
  dark_cavern: "dark_cavern",
  lava_river_crossing: "lava_river_crossing",
  lava_chamber: "lava_chamber",
  cave_shortcut: "cave_shortcut",
  ash_road: "ash_road",
  song_quest: "song_quest",
  dragon_chamber: "dragon_chamber",
  dragon_riddle: "dragon_riddle",
  ending_starvation: "ending_starvation",
  ending_dehydration: "ending_dehydration",
  ending_lost: "ending_lost",
  ending_friend: "ending_friend",
  ending_charmed: "ending_charmed",
  ending_appeased: "ending_appeased",
  ending_success: "ending_success",
  ending_secret: "ending_secret",
} as const;

const FLAG = {
  tended_wound: "tended_wound",
  sang_lullaby: "sang_lullaby",
  riddle_answered: "riddle_answered",
  riddle_failed: "riddle_failed",
  forest_riddle_passed: "forest_riddle_passed",
  forest_riddle_failed: "forest_riddle_failed",
  grabbed_egg: "grabbed_egg",
  // Derived (computed in PlayClient from counters; do not set explicitly):
  // food_critical, food_empty, water_critical, water_empty
} as const;

// Helper to build adventure-prefixed background ids.
const BG = (id: string) => `adventure:hunt-dragon-egg/${id}`;

// --- scenes ---

// Opening scene: an old talking oak poses a riddle. Right answer (river)
// passes the kid through with a "well answered" feeling. Wrong answers
// pass through too but set forest_riddle_failed so forest_path narration
// shifts to the oak echoing disappointment. No food cost; the cost is
// narrative.
const FOREST_RIDDLE: StoryScene = {
  id: SCENE.forest_riddle,
  title: "The Old Oak's Riddle",
  narration:
    "An ancient oak blocks the path, and a face has formed in its bark. It opens one slow eye and speaks. \"Answer my riddle, traveler, before you walk on. I run but never walk. I have a bed but never sleep. I have a mouth but never eat. What am I?\"",
  background_id: BG("forest_riddle"),
  ambient_audio_prompt: "deep slow wood creak, distant birds, soft wind",
  default_props: [],
  pickups: [],
  is_choice_scene: true,
  is_side_quest: false,
  oracle_hint:
    "It runs through the forest you came from. Listen for its bed of stones, and its mouth at the sea.",
  choices: [],
  choice_options: [
    {
      label: "A river",
      sets_flag: FLAG.forest_riddle_passed,
      goes_to: SCENE.forest_path,
    },
    {
      label: "A snake",
      sets_flag: FLAG.forest_riddle_failed,
      goes_to: SCENE.forest_path,
    },
    {
      label: "A path",
      sets_flag: FLAG.forest_riddle_failed,
      goes_to: SCENE.forest_path,
    },
  ],
};

// Side detour from riverbank: a fallen pine. Sword chops it into wood logs
// (the only way to gather wood). Without sword, kid sees the log but
// cannot chop. Returns to riverbank either way; the trip costs a tick of
// food regardless of outcome (effort spent).
const WOOD_GATHERING: StoryScene = {
  id: SCENE.wood_gathering,
  title: "The Fallen Pine",
  narration:
    "A long pine has fallen across the trail. Its bark is dry and the wood looks straight enough to build with. If you have a sharp edge, you could split it into logs.",
  background_id: BG("wood_gathering"),
  ambient_audio_prompt: "soft wind through pine needles, faint creak of wood",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1 },
  oracle_hint:
    "Wood like this builds rafts. A sword splits it cleanly. Without one, you waste effort here.",
  is_side_quest: false,
  choices: [
    {
      id: "chop_with_sword",
      label: "Chop it with your sword",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "chest",
      requires: ["sword"],
      grants: ["wood_logs"],
      hint: "swing steady; the wood splits clean",
    },
    {
      id: "back_to_river",
      label: "Leave the wood, return to the river",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "path",
      hint: "you cannot move this much wood without a blade",
    },
  ],
};

// River crossing: alternate route to volcano_base for kids who built a
// raft (rope + wood_logs). Without both items the kid cannot cross; the
// only options are to backtrack to the riverbank to gather what is
// missing. Real combinatorial gate.
const RIVER_CROSSING: StoryScene = {
  id: SCENE.river_crossing,
  title: "The Wide River",
  narration:
    "The river is wider here, the current deep and slow. You can see the volcano on the far side. There is no bridge. To cross, you would need a raft, lashed together from logs and a sturdy rope.",
  background_id: BG("river_crossing"),
  ambient_audio_prompt: "deep moving water, distant volcano rumble, wind across the river",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1, water: 1 },
  oracle_hint:
    "Wood and rope, lashed together. Without both, you cannot cross here. Go back if you must.",
  is_side_quest: false,
  choices: [
    {
      id: "build_raft",
      label: "Build a raft and cross",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      requires: ["wood_logs", "climbing_rope"],
      hint: "lash logs to rope; ride the current across",
    },
    {
      id: "back_to_river",
      label: "Turn back to the riverbank",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "path",
      hint: "you can gather wood there if you have a blade",
    },
  ],
};

// Dark cavern: gates the cave_shortcut. Pitch black inside; without a
// lantern the kid retreats in fear (heavy food cost). With a lantern the
// kid lights the way and proceeds to the cave_shortcut.
const DARK_CAVERN: StoryScene = {
  id: SCENE.dark_cavern,
  title: "The Dark Cavern",
  narration:
    "The cave mouth swallows the light. Beyond a few steps, you cannot see your own hand. Something rustles in the dark and stops when you stop. You will need a real flame to go further, or you will lose the way.",
  background_id: BG("dark_cavern"),
  ambient_audio_prompt: "deep hollow drip, distant flutter of wings, low cave hum",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1 },
  oracle_hint:
    "Without a lantern, the dark eats your food and your hours. Light it, or step back.",
  is_side_quest: false,
  choices: [
    {
      id: "light_lantern",
      label: "Light your lantern and press on",
      next_scene_id: SCENE.cave_shortcut,
      interactable_kind: "door",
      requires: ["lantern"],
      hint: "the flame shows the way",
    },
    {
      id: "stumble_back",
      label: "Stumble back into the daylight",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "you lose much food finding your way out",
    },
  ],
};

// Lava river crossing: gates lava_chamber. Two solutions. A raft built
// from wood + rope skims the lava (the wood smolders but does not burn
// through). Or: a sword can pry up cooled obsidian shards to make
// stepping stones. Without either, the kid turns back.
const LAVA_RIVER_CROSSING: StoryScene = {
  id: SCENE.lava_river_crossing,
  title: "The Lava River",
  narration:
    "A slow river of lava cuts across the path. The air shimmers. Cooled obsidian rocks jut up here and there. To cross, you would need a raft strong enough to ride the current, or a blade to lever the rocks into a row of stepping stones.",
  background_id: BG("lava_river_crossing"),
  ambient_audio_prompt: "low lava bubbling, hot air shimmer, deep rumble",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1, water: 1 },
  oracle_hint:
    "Two ways across. A raft of wood and rope skims the heat. A sword pries the obsidian into a path. Pick one.",
  is_side_quest: false,
  choices: [
    {
      id: "raft_lava",
      label: "Float a raft across",
      next_scene_id: SCENE.lava_chamber,
      interactable_kind: "path",
      requires: ["wood_logs", "climbing_rope"],
      hint: "wood smolders but holds; ride the current",
    },
    {
      id: "obsidian_steps",
      label: "Pry the obsidian into steps",
      next_scene_id: SCENE.lava_chamber,
      interactable_kind: "path",
      requires: ["sword"],
      hint: "lever the rocks; jump across",
    },
    {
      id: "back_to_volcano",
      label: "Turn back to the volcano base",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "another path waits",
    },
  ],
};

const FOREST_PATH: StoryScene = {
  id: SCENE.forest_path,
  title: "The Forest Path",
  narration:
    "The path forks. The cliff route is a shortcut, but it is steep. The riverbank is gentler, and you can hear water.",
  background_id: BG("forest_path"),
  ambient_audio_prompt: "soft wind, distant birds, leaves rustling",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1, water: 1 },
  background_variants: [
    { when: { food_critical: true }, background_id: BG("forest_path_hungry") },
  ],
  narration_variants: [
    {
      when: { food_critical: true },
      text: "The path forks. Your legs feel heavier than they should. The trees seem taller, the road longer.",
    },
  ],
  oracle_hint:
    "The cliff is faster but only with rope. The river is gentler and has gifts you might need.",
  is_side_quest: false,
  choices: [
    {
      id: "go_cliff",
      label: "Take the cliff shortcut",
      next_scene_id: SCENE.cliff_climb,
      interactable_kind: "path",
      requires: ["climbing_rope"],
      hint: "shortcut, but you will need the rope",
    },
    {
      id: "go_riverbank",
      label: "Take the riverbank",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "path",
      hint: "longer, but the water sings",
    },
  ],
};

const CLIFF_CLIMB: StoryScene = {
  id: SCENE.cliff_climb,
  title: "The Cliff",
  narration:
    "The cliff is steep but the rope holds. You climb. Wind whips past, then settles. At the top, the volcano fills the horizon.",
  background_id: BG("cliff_climb"),
  ambient_audio_prompt: "wind through rocks, faint rope creak",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1 },
  oracle_hint:
    "The wind dies near the top. Hold on, and your rope will hold for you.",
  is_side_quest: false,
  choices: [
    {
      id: "climb_to_volcano",
      label: "Pull yourself up",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "the volcano waits ahead",
    },
    {
      id: "back_to_forest",
      label: "Climb back down",
      next_scene_id: SCENE.forest_path,
      interactable_kind: "path",
      hint: "rejoin the forest fork below",
    },
  ],
};

const RIVERBANK: StoryScene = {
  id: SCENE.riverbank,
  title: "The Riverbank",
  narration:
    "A clear bend in the river. The water hums an old kind tune. You drink your fill. The reeds sway. A sturdy gourd glints by the bank, ready to shape into a bottle, and the fish trap by the reeds bobs with a fresh catch.",
  background_id: BG("riverbank"),
  ambient_audio_prompt: "lapping water, soft frogs, gentle wind through reeds",
  default_props: [],
  pickups: ["water_bottle", "food_ration"],
  counter_tick: { food: 1 },
  replenish: { water: 6 },
  oracle_hint:
    "Tap the gourd for a bottle. Tap the fish trap for a meal. The wide river is the way forward; the fallen pine off the trail can be split into wood.",
  is_side_quest: false,
  choices: [
    {
      id: "to_river_crossing",
      label: "Follow the river to the wide crossing",
      next_scene_id: SCENE.river_crossing,
      interactable_kind: "path",
      hint: "the volcano lies past a wide bend; you may need a raft to cross",
    },
    {
      id: "to_wood_gathering",
      label: "Detour to the fallen pine",
      next_scene_id: SCENE.wood_gathering,
      interactable_kind: "path",
      hint: "wood for a raft, if you have a blade to chop",
    },
    {
      id: "back_to_forest",
      label: "Go back to the fork",
      next_scene_id: SCENE.forest_path,
      interactable_kind: "path",
      hint: "you can take the cliff route instead",
    },
  ],
};

const VOLCANO_BASE: StoryScene = {
  id: SCENE.volcano_base,
  title: "The Volcano Base",
  narration:
    "The mountain cracks. One huge stone eye opens in the rockface, glowing red, looking right at you. A low rumble fills the air. There are three paths up.",
  background_id: BG("volcano_base_speaks"),
  ambient_audio_prompt: "deep volcanic rumble, distant roar, heat shimmer",
  default_props: [],
  pickups: ["tarnished_medallion"],
  counter_tick: { food: 1, water: 1 },
  background_variants: [
    { when: { water_critical: true }, background_id: BG("volcano_base_thirsty") },
  ],
  narration_variants: [
    {
      when: { water_critical: true },
      text: "The mountain stares down at you with one stone eye, glowing red. Heat shimmers in the air. Your throat is dry as ash.",
    },
  ],
  oracle_hint:
    "The vent path needs steel. The cave needs light. The ash road costs more food and water but always opens.",
  is_side_quest: false,
  choices: [
    {
      id: "vent_path",
      label: "Take the vent path",
      next_scene_id: SCENE.lava_river_crossing,
      interactable_kind: "path",
      hint: "a river of lava cuts across the way; you will need a way to cross",
    },
    {
      id: "cave_path",
      label: "Take the cave shortcut",
      next_scene_id: SCENE.dark_cavern,
      interactable_kind: "door",
      hint: "the cave mouth is dark; bring a flame or turn back",
    },
    {
      id: "to_ash_road",
      label: "Take the long ash road",
      next_scene_id: SCENE.ash_road,
      interactable_kind: "path",
      hint: "the long way around, dry and dusty",
    },
    {
      id: "back_to_forest",
      label: "Go back to the forest fork",
      next_scene_id: SCENE.forest_path,
      interactable_kind: "path",
      hint: "you can take the other route this time",
    },
  ],
};

const ASH_ROAD: StoryScene = {
  id: SCENE.ash_road,
  title: "The Long Ash Road",
  narration:
    "You walk the long way around. Hot ash drifts in the air and the sun is bright. The road is empty. Every step is dusty. Every breath is dry. The cavern entrance comes into view, finally.",
  background_id: BG("volcano_base_thirsty"),
  ambient_audio_prompt: "dry hot wind, faint distant rumble, scuffed footsteps",
  default_props: [],
  pickups: [],
  counter_tick: { food: 2, water: 2 },
  oracle_hint:
    "Ash is dry. Walk steady. The cavern is closer than it feels.",
  is_side_quest: false,
  choices: [
    {
      id: "to_dragon",
      label: "Push on to the cavern",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "path",
      hint: "the air cools as you reach the cavern mouth",
    },
    {
      id: "back_to_volcano",
      label: "Turn back to the volcano base",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "you can pick a different way up",
    },
  ],
};

const LAVA_CHAMBER: StoryScene = {
  id: SCENE.lava_chamber,
  title: "The Lava Chamber",
  narration:
    "Streams of orange lava flow through black stone. Vines of cooled lava block the way. You cut them with the sword and press through. The heat is exhausting.",
  background_id: BG("lava_chamber"),
  ambient_audio_prompt: "lava bubbling, hot air shimmer, distant deep rumble",
  default_props: [],
  pickups: [],
  counter_tick: { food: 2 },
  oracle_hint: "Vines part where steel cuts. Push through, the path opens.",
  is_side_quest: false,
  choices: [
    {
      id: "to_dragon",
      label: "Push through to the nest",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "path",
      hint: "you can hear breathing ahead",
    },
    {
      id: "back_to_volcano",
      label: "Turn back to the volcano base",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "you can pick a different way up",
    },
  ],
};

const CAVE_SHORTCUT: StoryScene = {
  id: SCENE.cave_shortcut,
  title: "The Quiet Cave",
  narration:
    "Cool blue light glows from mushrooms on the walls. An old camp sits in the corner with a packet of trail rations someone left. As you take what you need, you notice a faded scroll wedged beneath a stone. The words on it hum with an old song.",
  background_id: BG("cave_shortcut"),
  ambient_audio_prompt: "soft cave drips, faint humming crystals, distant water",
  default_props: [],
  pickups: ["dragons_lullaby"],
  counter_tick: { food: 1 },
  replenish: { food: 6 },
  oracle_hint:
    "The campfire is cold but the rations are good. The scroll under the stone hums an old song. Take it.",
  is_side_quest: false,
  choices: [
    {
      id: "to_dragon",
      label: "Follow the path deeper",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "path",
      hint: "the cave opens ahead",
    },
    {
      id: "back_to_volcano",
      label: "Turn back to the volcano base",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "you can pick a different way up",
    },
  ],
};

const DRAGON_CHAMBER: StoryScene = {
  id: SCENE.dragon_chamber,
  title: "The Nesting Cavern",
  narration:
    "She watches you. Her side is scarred from old battles. Her breath is slow. The egg pulses softly between her claws. She does not move.",
  background_id: BG("dragon_chamber_wounded"),
  ambient_audio_prompt: "low dragon breath, faint warm hum, distant cavern echo",
  default_props: [],
  pickups: [],
  background_variants: [
    {
      when: { tended_wound: true, sang_lullaby: true },
      background_id: BG("dragon_chamber_calm"),
    },
    { when: { sang_lullaby: true }, background_id: BG("dragon_chamber_calm") },
    { when: { tended_wound: true }, background_id: BG("dragon_chamber_calm") },
  ],
  narration_variants: [
    {
      when: { tended_wound: true, sang_lullaby: true },
      text: "You have tended her hurt and sung the old song. Her eyes are kind. The cavern feels warm. The egg pulses gently between her claws.",
    },
    {
      when: { sang_lullaby: true },
      text: "The old song still drifts in the air. Her eyes are half closed. The cavern is quiet.",
    },
    {
      when: { tended_wound: true },
      text: "Her side is dressed and her breath comes easier now. She is still watching you, but her eyes are softer.",
    },
    {
      when: { riddle_answered: true },
      text: "You answered her question. Her eyes are kinder now. She watches you, listening for the next thing you do.",
    },
    {
      when: { riddle_failed: true },
      text: "You answered her question, but the words felt wrong even to you. She watches you closer than before.",
    },
  ],
  oracle_hint:
    "She is hurt. She has a heart. Find what she needs before you reach for the egg.",
  is_side_quest: false,
  choices: [
    {
      id: "tend_wound",
      label: "Tend her wound",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      requires: ["food_ration"],
      consumes: ["food_ration"],
      sets_flag: FLAG.tended_wound,
      hint: "she is hurt, perhaps you can help",
    },
    {
      id: "sing_lullaby",
      label: "Sing the lullaby",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      requires: ["dragons_lullaby"],
      sets_flag: FLAG.sang_lullaby,
      hint: "the old song might soothe her",
    },
    {
      id: "answer_riddle",
      label: "Answer her riddle",
      next_scene_id: SCENE.dragon_riddle,
      interactable_kind: "creature",
      hint: "she will ask why you came, and the answer matters",
    },
    {
      id: "search_for_song",
      label: "Step back to search for the song",
      next_scene_id: SCENE.song_quest,
      interactable_kind: "path",
      hint: "the long way back, this trip will cost much food and water",
    },
    {
      id: "take_egg",
      label: "Take the egg",
      next_scene_id: SCENE.ending_success,
      interactable_kind: "chest",
      grants: ["dragons_egg"],
      sets_flag: FLAG.grabbed_egg,
      hint: "the moment you commit, there is no going back",
    },
  ],
};

// Backtrack scene: kid steps out of dragon_chamber to find the lullaby
// they did not pick up. Heavy food + water cost (the long way back), then
// returns to dragon_chamber with the lullaby in hand. Visible from
// dragon_chamber as "Step back to search for the song". Kids who already
// have the lullaby can still tap it but get nothing extra, so the hint
// telegraphs the cost.
const SONG_QUEST: StoryScene = {
  id: SCENE.song_quest,
  title: "The Long Way Back",
  narration:
    "You step out of the cavern and follow the path back the way you came. The way is long and your supplies thin. After much walking, you find a quiet hollow where moss has grown over a forgotten stone. A scroll lies beneath, humming with the old song. You tuck it away and turn back to face the dragon.",
  background_id: BG("cave_shortcut"),
  ambient_audio_prompt: "tired footsteps, distant cave echo, faint humming",
  default_props: [],
  pickups: [],
  counter_tick: { food: 3, water: 3 },
  oracle_hint:
    "The way back costs much. But the song is worth singing. Take care with what you have left.",
  is_side_quest: false,
  choices: [
    {
      id: "return_to_dragon",
      label: "Return to the cavern, song in hand",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "path",
      grants: ["dragons_lullaby"],
      hint: "the dragon waits where you left her",
    },
  ],
};

// is_choice_scene sub-scene: the dragon's riddle. Reached only via the
// "Answer her riddle" choice in dragon_chamber. Both options route back to
// dragon_chamber so the kid can still tend the wound, sing, or take the
// egg afterward. Right answer sets riddle_answered (helps appease).
// Wrong answer sets riddle_failed (does not block, but does not help
// either — narration variant in dragon_chamber softens the next moment).
const DRAGON_RIDDLE: StoryScene = {
  id: SCENE.dragon_riddle,
  title: "The Riddle",
  narration:
    "She speaks. Her voice is older than the mountain. \"Listen, small one, and answer if you can. What has roots nobody sees? It is taller than trees. Up, up it goes, and yet never grows.\"",
  background_id: BG("dragon_chamber_wounded"),
  ambient_audio_prompt: "deep slow dragon breath, very faint warm hum",
  default_props: [],
  pickups: [],
  is_choice_scene: true,
  is_side_quest: false,
  oracle_hint:
    "Roots that nobody sees. Taller than the tallest trees. It does not grow, but it is always rising. Look around you.",
  choices: [],
  choice_options: [
    {
      label: "A mountain",
      sets_flag: FLAG.riddle_answered,
      goes_to: SCENE.dragon_chamber,
    },
    {
      label: "A tall tower",
      sets_flag: FLAG.riddle_failed,
      goes_to: SCENE.dragon_chamber,
    },
    {
      label: "A great king",
      sets_flag: FLAG.riddle_failed,
      goes_to: SCENE.dragon_chamber,
    },
  ],
};

// --- endings (each is a real scene with empty choices) ---

const ENDING_STARVATION: StoryScene = {
  id: SCENE.ending_starvation,
  title: "Too Far",
  narration:
    "You sit down to rest. Just for a moment. The pack is empty. The sky goes purple, then dark. Some journeys end like this. The realm remembers you anyway.",
  background_id: BG("ending_starvation"),
  ambient_audio_prompt: "soft wind, faint distant chimes, slow quiet",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_DEHYDRATION: StoryScene = {
  id: SCENE.ending_dehydration,
  title: "Dry Spring",
  narration:
    "The spring is cracked and dry. Your bottle is empty. You kneel a long time. The realm goes still around you. The journey rests here.",
  background_id: BG("ending_dehydration"),
  ambient_audio_prompt: "very faint wind, dry rustle, slow quiet",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_LOST: StoryScene = {
  id: SCENE.ending_lost,
  title: "Lost in the Ash",
  narration:
    "The path looped. And looped again. The ash drifts deeper. Your footprints stretch back behind you, and the volcano is small now. Some adventures end with a quiet question. You will tell the story when you find your way out.",
  background_id: BG("ending_lost"),
  ambient_audio_prompt: "very low ash wind, distant rumble, hollow silence",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_FRIEND: StoryScene = {
  id: SCENE.ending_friend,
  title: "The Best of Friends",
  narration:
    "You walk back toward the castle in golden light. The egg is warm in your hands. Vex flies above you, slow and steady, and the kingdom looks up at her without fear for the first time in a hundred years. Some endings are the start of something else.",
  background_id: BG("ending_friend"),
  ambient_audio_prompt: "warm wind, distant cheerful bells, soft dragon breath",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_CHARMED: StoryScene = {
  id: SCENE.ending_charmed,
  title: "Sleep Soft, Mother",
  narration:
    "You leave at peaceful dawn. The sky is pink and gold. Behind you on the mountain, Vex sleeps curled around herself, breathing slow and deep. The egg pulses warm in your hands. The wards will hold.",
  background_id: BG("ending_charmed"),
  ambient_audio_prompt: "soft dawn wind, faint distant breath, calm bells",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_APPEASED: StoryScene = {
  id: SCENE.ending_appeased,
  title: "Earned",
  narration:
    "You step out into the dusk with the egg in both hands. The volcano is quiet behind you, the sky purple and rose. You did not just take. You earned. The realm remembers.",
  background_id: BG("ending_appeased"),
  ambient_audio_prompt: "calm dusk wind, faint distant chimes, settled quiet",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_SUCCESS: StoryScene = {
  id: SCENE.ending_success,
  title: "Run, Wizard",
  narration:
    "You snatch the egg and run. Behind you the cavern shakes with a roar. You make it to the gate panting, the egg clutched tight, smoke rising on the horizon. The kingdom is safe tonight. Vex is watching.",
  background_id: BG("ending_success"),
  ambient_audio_prompt: "panting breath, distant roar, quick wind",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_SECRET: StoryScene = {
  id: SCENE.ending_secret,
  title: "Hatched at Home",
  narration:
    "Long after the journey, by the fire, the egg cracks. A tiny dragon climbs out, eyes blinking at the warm light. It looks at you and chirps once. You laugh. The realm has a secret now, and it is yours.",
  background_id: BG("ending_secret"),
  ambient_audio_prompt: "warm hearth crackle, faint chirp, soft breath",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

// --- the tree ---

const STORY: StoryTree = {
  title: "Hunt the Dragon's Egg",
  starting_scene_id: SCENE.forest_riddle,
  default_character_id: "wizard",
  scenes: [
    FOREST_RIDDLE,
    FOREST_PATH,
    CLIFF_CLIMB,
    RIVERBANK,
    WOOD_GATHERING,
    RIVER_CROSSING,
    VOLCANO_BASE,
    DARK_CAVERN,
    LAVA_RIVER_CROSSING,
    LAVA_CHAMBER,
    CAVE_SHORTCUT,
    ASH_ROAD,
    SONG_QUEST,
    DRAGON_CHAMBER,
    DRAGON_RIDDLE,
    ENDING_STARVATION,
    ENDING_DEHYDRATION,
    ENDING_LOST,
    ENDING_FRIEND,
    ENDING_CHARMED,
    ENDING_APPEASED,
    ENDING_SUCCESS,
  ],
  secret_ending: ENDING_SECRET,
  flags: [
    { id: FLAG.tended_wound, description: "tended the dragon's wound" },
    { id: FLAG.sang_lullaby, description: "sang the lullaby to the dragon" },
    { id: FLAG.riddle_answered, description: "answered the dragon's riddle truthfully" },
    { id: FLAG.riddle_failed, description: "answered the dragon's riddle dismissively" },
    { id: FLAG.forest_riddle_passed, description: "answered the old oak's riddle correctly" },
    { id: FLAG.forest_riddle_failed, description: "missed the old oak's riddle" },
    { id: FLAG.grabbed_egg, description: "took the dragon's egg" },
  ],
  endings: [
    { scene_id: SCENE.ending_starvation, requires: { food_empty: true } },
    { scene_id: SCENE.ending_dehydration, requires: { water_empty: true } },
    {
      scene_id: SCENE.ending_friend,
      requires: { [FLAG.tended_wound]: true, [FLAG.sang_lullaby]: true },
    },
    { scene_id: SCENE.ending_charmed, requires: { [FLAG.sang_lullaby]: true } },
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.tended_wound]: true } },
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.riddle_answered]: true } },
    { scene_id: SCENE.ending_success, requires: {} },
  ],
  level: 1,
  hero_lines: [
    { kind: "thought", text: "If I take the cliff, the rope better hold." },
    { kind: "thought", text: "Water tastes different when you really need it." },
    { kind: "joke", text: "Note to self: do not annoy the talking mountain." },
    { kind: "thought", text: "The mother does not look only fierce. She looks tired." },
    { kind: "joke", text: "Wizard with sword. The bards will love this." },
  ],
  hero_voice: "Ryan",
  prologue: {
    background_id: BG("prologue_courtyard"),
    oracle_lines: [
      "Listen well. The castle's wards are dying. Only a dragon's egg can renew them.",
      "The egg lies in a nesting cave on the volcano. Forest first, then steep paths, then the mountain itself.",
      "You will be hungry. You will be thirsty. Carry food and water for the road.",
      "A rope helps for the cliffs. A sword cuts vines of cooled lava. A lantern reaches the cave shortcut.",
      "The mother is fierce. But she has a heart. Remember this when you stand before her.",
      "Choose three things to bring.",
    ],
    preload_scene_ids: [
      SCENE.forest_path,
      SCENE.cliff_climb,
      SCENE.riverbank,
      SCENE.volcano_base,
      SCENE.dragon_chamber,
    ],
  },
  counter_defs: [
    {
      id: "food",
      label: "Food",
      max: 6,
      icon_path: "/pickups/food_ration.webp",
      critical_at: 2,
    },
    {
      id: "water",
      label: "Water",
      max: 6,
      icon_path: "/pickups/water_bottle.webp",
      critical_at: 2,
    },
    {
      id: "coins",
      label: "Coins",
      max: 9999,
      icon_path: "/pickups/coin_pouch.webp",
      critical_at: 0,
      start_at: 50,
    },
  ],
  starter_choices: {
    candidates: ["climbing_rope", "sword", "water_bottle", "food_ration", "lantern"],
    required_count: 3,
  },
  oracle_hint_budget: 3,
};

export const HUNT_DRAGON_EGG: Adventure = {
  id: "hunt-dragon-egg",
  story: STORY,
};
