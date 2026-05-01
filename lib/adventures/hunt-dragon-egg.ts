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
  // B-014 economy expansion: 8 new scenes for treasures, markets, mounts,
  // and a converging cubs antechamber before the final cavern.
  wolf_encounter: "wolf_encounter",
  waterfall_climb: "waterfall_climb",
  eagle_nest: "eagle_nest",
  bone_field: "bone_field",
  crystal_chamber: "crystal_chamber",
  dragon_cubs: "dragon_cubs",
  shrine: "shrine",
  thief_encounter: "thief_encounter",
  ending_starvation: "ending_starvation",
  ending_dehydration: "ending_dehydration",
  ending_lost: "ending_lost",
  ending_friend: "ending_friend",
  ending_charmed: "ending_charmed",
  ending_appeased: "ending_appeased",
  ending_blessed: "ending_blessed",
  ending_composer: "ending_composer",
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
  // B-014 economy: shrine blessing + thief encounter outcome.
  blessing: "blessing",
  robbed: "robbed",
  // B-019 build economy. composer_masterwork unlocks the new Composer
  // ending when the kid plays a level-5 music box. music_box_basic
  // routes a low-level music box to Appeased. snatched_egg drives the
  // stripped realm card on the snatch path.
  composer_masterwork: "composer_masterwork",
  music_box_basic: "music_box_basic",
  snatched_egg: "snatched_egg",
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
  // B-017: the rendered art is the enchanted forest, not the oak itself, so
  // the title now matches what the kid sees. The riddle motif still lives
  // in the narration body (and in narration variants downstream).
  title: "The Enchanted Forest",
  narration:
    "An ancient oak blocks the path, and a face has formed in its bark. It opens one slow eye and speaks. \"Answer my riddle, traveler, before you walk on. I run but never walk. I have a bed but never sleep. I have a mouth but never eat. What am I?\"",
  background_id: BG("forest_riddle"),
  entry_video_path: "/adventures/hunt-dragon-egg/forest_riddle_entry.mp4",
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
      oracle_hint:
        "Wood splits clean for a sharp edge. A blade is something a wizard packs from home.",
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
      hide_when_inventory_has: ["built_raft"],
      hint: "lash logs to rope; ride the current across",
      oracle_hint:
        "Rafts ask for two things: wood from the fallen pine off the trail, and rope from where the river bends.",
    },
    // B-019: a raft you crafted in Skills & Build. Consumes the built
    // pickup; arrival narration is the same as build_raft above.
    {
      id: "cross_with_built_raft",
      label: "Cross on the raft you built",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      requires: ["built_raft"],
      consumes: ["built_raft"],
      hint: "your raft holds; the current carries you across",
      oracle_hint:
        "A raft of your making spares you the chop. Visit the shop, then the Skills panel.",
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
  entry_video_path: "/adventures/hunt-dragon-egg/dark_cavern_entry.mp4",
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
      oracle_hint:
        "Light is something you carry from home. The cave will not give it. Step back and try the long road instead.",
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
  entry_video_path: "/adventures/hunt-dragon-egg/lava_river_crossing_entry.mp4",
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
      oracle_hint:
        "Wood floats even on lava when lashed with rope. Or, if you have steel, the obsidian breaks into steps.",
    },
    {
      id: "obsidian_steps",
      label: "Pry the obsidian into steps",
      next_scene_id: SCENE.lava_chamber,
      interactable_kind: "path",
      requires: ["sword"],
      hint: "lever the rocks; jump across",
      oracle_hint:
        "Steel pries the cooled stones into a path. A blade is something a wizard packs from home.",
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
    "The cliff is faster but only with rope. The river is gentler and has gifts you might need. A small shrine sits off the path, if you wish to leave a coin and ask for kindness.",
  is_side_quest: false,
  choices: [
    {
      id: "go_cliff",
      label: "Take the cliff shortcut",
      next_scene_id: SCENE.cliff_climb,
      interactable_kind: "path",
      requires: ["climbing_rope"],
      hide_when_inventory_has: ["built_ladder"],
      hint: "shortcut, but you will need the rope",
      oracle_hint:
        "Coils of rope sometimes wash up where the river bends. Listen for the water and walk that way.",
    },
    // B-019: a built ladder skips the rope gate. Consumed on use.
    {
      id: "climb_with_ladder",
      label: "Climb with the ladder you built",
      next_scene_id: SCENE.cliff_climb,
      interactable_kind: "path",
      requires: ["built_ladder"],
      consumes: ["built_ladder"],
      hint: "your ladder leans against the cliff and holds steady",
      oracle_hint:
        "A ladder of your own making spares the rope. Build one in Skills, materials from the Supreme Shop.",
    },
    {
      id: "go_riverbank",
      label: "Take the riverbank",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "path",
      hint: "longer, but the water sings",
    },
    {
      id: "to_shrine",
      label: "Visit the small shrine",
      next_scene_id: SCENE.shrine,
      interactable_kind: "sparkle",
      hint: "an old shrine in a clearing; quiet and kind",
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
      next_scene_id: SCENE.wolf_encounter,
      interactable_kind: "path",
      hint: "a narrow ledge runs above; something moves up there",
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
    "Tap the gourd for a bottle. Tap the fish trap for a meal. The wide river is the way forward; the fallen pine off the trail can be split into wood. A river fisher may sell supplies, and a pony for hire knows the way around the wide bend.",
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
    {
      id: "to_waterfall_climb",
      label: "Climb up alongside the falls",
      next_scene_id: SCENE.waterfall_climb,
      interactable_kind: "path",
      requires: ["climbing_rope"],
      hint: "rope and a steady grip; treasure tucked above",
      oracle_hint:
        "Climbs ask for rope. A coil from home, or a coil left where the river bends.",
    },
    {
      id: "fisher_market",
      label: "Buy supplies from the river fisher (50 coins)",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "creature",
      coin_cost: 50,
      grants_counter: { food: 4, water: 4 },
      hint: "the fisher sells fresh fish and clean water",
    },
    {
      id: "river_pony_mount",
      label: "Pay 200 coins for a river pony",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "creature",
      coin_cost: 200,
      hint: "the pony knows the way; she carries you fast around the wide river and the wood you would have chopped",
    },
  ],
};

const VOLCANO_BASE: StoryScene = {
  id: SCENE.volcano_base,
  title: "The Volcano Base",
  narration:
    "The mountain cracks. One huge stone eye opens in the rockface, glowing red, looking right at you. A low rumble fills the air. There are three paths up.",
  background_id: BG("volcano_base_speaks"),
  entry_video_path: "/adventures/hunt-dragon-egg/volcano_base_speaks_entry.mp4",
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
    "The vent path needs steel. The cave needs light. The ash road costs more food and water but always opens. The bone field off the slope is dangerous, but glints with treasure.",
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
    {
      id: "to_bone_field",
      label: "Search the bone field",
      next_scene_id: SCENE.bone_field,
      interactable_kind: "path",
      hint: "old bones and glinting stones; risky, but rewarding",
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
    "Ash is dry. Walk steady. The cavern is closer than it feels. A desert lizard for hire knows the heat. A hooded traveler may want a toll.",
  is_side_quest: false,
  choices: [
    {
      id: "to_dragon",
      label: "Push on to the cavern",
      next_scene_id: SCENE.dragon_cubs,
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
    {
      id: "lizard_mount",
      label: "Pay 200 coins for a desert lizard",
      next_scene_id: SCENE.dragon_cubs,
      interactable_kind: "creature",
      coin_cost: 200,
      hint: "the lizard runs the heat-cracked road; you arrive in half the time, hot but whole",
    },
    {
      id: "to_thief_encounter",
      label: "A traveler approaches",
      next_scene_id: SCENE.thief_encounter,
      interactable_kind: "creature",
      hint: "a hooded figure on the road; intentions unclear",
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
      next_scene_id: SCENE.dragon_cubs,
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
    "The campfire is cold but the rations are good. The scroll under the stone hums an old song. Take it. A side passage glows faintly with crystals if you have a lantern. The cave hermit will trade for the lullaby, for a price.",
  is_side_quest: false,
  choices: [
    {
      id: "to_dragon",
      label: "Follow the path deeper",
      next_scene_id: SCENE.dragon_cubs,
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
    {
      id: "to_crystal_chamber",
      label: "Explore the crystal passage",
      next_scene_id: SCENE.crystal_chamber,
      interactable_kind: "door",
      requires: ["lantern"],
      hint: "lantern light shows the way; cool blue glow ahead",
      oracle_hint:
        "Light reveals the crystals. Without it, the passage stays a quiet dark.",
    },
    {
      id: "hermit_market",
      label: "Trade with the cave hermit for the lullaby (200 coins)",
      next_scene_id: SCENE.cave_shortcut,
      interactable_kind: "creature",
      coin_cost: 200,
      grants: ["dragons_lullaby"],
      hint: "the hermit will sing the song into your scroll, for a price",
    },
  ],
};

const DRAGON_CHAMBER: StoryScene = {
  id: SCENE.dragon_chamber,
  title: "The Nesting Cavern",
  narration:
    "She watches you. Her side is scarred from old battles. Her breath is slow. The egg pulses softly between her claws. She does not move.",
  background_id: BG("dragon_chamber_wounded"),
  entry_video_path: "/adventures/hunt-dragon-egg/dragon_chamber_entry.mp4",
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
    {
      when: { blessing: true, has_glowstone: true },
      text: "She watches you. The blessing in your pocket steadies your hands, and the glowstone pulses warmly, and the cavern feels less cold than it should be. The egg pulses softly between her claws.",
    },
    {
      when: { blessing: true },
      text: "She watches you. Her side is scarred from old battles. The small blessing in your pocket steadies your hands. The egg pulses softly between her claws. She does not move.",
    },
    {
      when: { has_glowstone: true },
      text: "She watches you. Her side is scarred from old battles. The glowstone in your pocket pulses warmly, and the cavern feels less cold. The egg pulses softly between her claws.",
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
      oracle_hint:
        "She is hungry as well as hurt. A meal in your pocket can steady her.",
    },
    {
      id: "sing_lullaby",
      label: "Sing the lullaby",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      requires: ["dragons_lullaby"],
      hide_when_inventory_has: ["built_music_box"],
      sets_flag: FLAG.sang_lullaby,
      hint: "the old song might soothe her",
      oracle_hint:
        "An old song rests in scrolls left in cool, quiet caves. Take the path that smells of stone.",
    },
    // B-019: a music box you built. Loops back to dragon_chamber the
    // way the lullaby choice does. Level (recorded at build time) drives
    // the resulting flags via builds-catalog.consume_level_flags so that
    // a level-5 music box unlocks the new Composer ending.
    {
      id: "play_music_box",
      label: "Play the music box you built",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      requires: ["built_music_box"],
      consumes: ["built_music_box"],
      hint: "the cavern fills with a tune of your own making",
      oracle_hint:
        "A music box you craft yourself. Cloth, wax, and feather. Five details in your prompt unlock something special.",
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
    // B-019: Take the egg now costs 200 coins AND requires one of three
    // earned items. Routes to the existing endings system; the kid gets
    // Friend / Charmer / Composer / Appeased / Blessed depending on the
    // flags they have built up.
    {
      id: "take_egg",
      label: "Take the egg, with thanks (200 coins)",
      next_scene_id: SCENE.ending_success,
      interactable_kind: "chest",
      coin_cost: 200,
      requires_any: ["dragons_lullaby", "rare_gem", "built_music_box"],
      grants: ["dragons_egg"],
      sets_flag: FLAG.grabbed_egg,
      hint: "you offer coins and a token; she lets you take the egg",
      oracle_hint:
        "The egg is not free. The realm asks for 200 coins and proof you earned the trip: a lullaby scroll, a rare gem, or a music box you built.",
    },
    // B-019: the snatch path is always available. Routes to ending_success
    // (existing Snatcher narration). Sets the snatched_egg flag so the
    // realm card renders stripped (no ingredients grid, no coins, no
    // trophies).
    {
      id: "snatch_egg",
      label: "Snatch the egg and run",
      next_scene_id: SCENE.ending_success,
      interactable_kind: "chest",
      grants: ["dragons_egg"],
      sets_flag: FLAG.snatched_egg,
      hint: "fast hands, hard cost; the realm will whisper",
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

// --- B-014 economy expansion scenes ---

// Wolf encounter: blocks the cliff_climb forward path. Three solutions
// (sword, food bribe, coin bribe) all lead onward to eagle_nest. The
// kid can also climb back down. Scene-tick costs food regardless of
// outcome (effort spent on the standoff).
const WOLF_ENCOUNTER: StoryScene = {
  id: SCENE.wolf_encounter,
  title: "The Cliff Wolf",
  narration:
    "A gray wolf blocks the narrow ledge ahead. Its yellow eyes track you. Its lip lifts back, just enough to show teeth. It is not yet snarling. It is waiting to see what you will do.",
  background_id: BG("wolf_encounter"),
  ambient_audio_prompt: "low wind on stone, distant wolf breath, soft growl",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1 },
  oracle_hint:
    "Steel works. So does a meal. Coins jingle and confuse. Climbing back is always allowed.",
  is_side_quest: false,
  choices: [
    {
      id: "fight_wolf",
      label: "Fight with your sword",
      next_scene_id: SCENE.eagle_nest,
      interactable_kind: "creature",
      requires: ["sword"],
      hint: "the wolf yields to a clean strike",
      oracle_hint:
        "Steel calms the wolf. A blade rests at home for those who packed it.",
    },
    {
      id: "feed_wolf",
      label: "Throw it a food ration",
      next_scene_id: SCENE.eagle_nest,
      interactable_kind: "creature",
      requires: ["food_ration"],
      consumes: ["food_ration"],
      hint: "the wolf takes the meal and lets you pass",
      oracle_hint:
        "A hungry wolf is gentler with a meal in its mouth. Trail rations win quiet.",
    },
    {
      id: "bribe_wolf",
      label: "Toss it 50 coins",
      next_scene_id: SCENE.eagle_nest,
      interactable_kind: "creature",
      coin_cost: 50,
      hint: "the wolf bats the coins, distracted, and you slip past",
    },
    {
      id: "back_to_cliff",
      label: "Back down the cliff",
      next_scene_id: SCENE.cliff_climb,
      interactable_kind: "path",
      hint: "you can try the river route instead",
    },
  ],
};

// Waterfall climb: side trip from riverbank. Gated by climbing_rope. The
// kid finds a treasure_chest pickup (150 coins via the new coin_value
// pattern). Returns to riverbank.
const WATERFALL_CLIMB: StoryScene = {
  id: SCENE.waterfall_climb,
  title: "Behind the Falls",
  narration:
    "You climb up alongside the waterfall. The mist soaks you, the rope holds. At the top, half hidden behind a curtain of moss, sits a small wooden chest, its brass clasps catching what light reaches up here.",
  background_id: BG("waterfall_climb"),
  ambient_audio_prompt: "rushing water, soft mist, distant birds",
  default_props: [],
  pickups: ["treasure_chest"],
  counter_tick: { food: 1 },
  oracle_hint:
    "Tap the chest to claim it. Then climb back down to the river.",
  is_side_quest: false,
  choices: [
    {
      id: "back_to_riverbank",
      label: "Climb back down to the river",
      next_scene_id: SCENE.riverbank,
      interactable_kind: "path",
      hint: "the river bend waits below",
    },
  ],
};

// Eagle nest: slot between wolf_encounter and volcano_base on the cliff
// path. Pickup is a coin_pouch (50 coins). Three exits: hide quietly,
// fight (sword), or climb back down.
const EAGLE_NEST: StoryScene = {
  id: SCENE.eagle_nest,
  title: "The Eagle's Nest",
  narration:
    "A great eagle's nest perches at the edge of the cliff, woven from sticks twice your height. The eagle is not in it now. Inside, pale eggs nestle next to a glittering pile of coins and shells. The eagle could return at any moment.",
  background_id: BG("eagle_nest"),
  ambient_audio_prompt: "high wind, faint distant wing beats, scattered loose stones",
  default_props: [],
  pickups: ["coin_pouch"],
  counter_tick: { food: 1 },
  oracle_hint:
    "Tap the pouch first. Then choose: wait the eagle out, draw your sword, or back away.",
  is_side_quest: false,
  choices: [
    {
      id: "hide_quietly",
      label: "Hide quietly",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "wait for the eagle to leave; safe but slow",
    },
    {
      id: "fight_eagle",
      label: "Fight with your sword",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "creature",
      requires: ["sword"],
      hint: "the eagle backs off; you press on toward the volcano",
      oracle_hint:
        "Steel makes the eagle back away. Or you can wait quietly until she leaves.",
    },
    {
      id: "back_to_cliff",
      label: "Climb back down",
      next_scene_id: SCENE.cliff_climb,
      interactable_kind: "path",
      hint: "you can pick a different route",
    },
  ],
};

// Bone field: side trip from volcano_base. Pickup is a rare_gem (200
// coins). Heavy tick (food + water) reflects the dangerous detour. One
// way out: back to volcano_base.
const BONE_FIELD: StoryScene = {
  id: SCENE.bone_field,
  title: "The Bone Field",
  narration:
    "Old skeletons lie half-buried in the ash. Some travelers came this way before you and did not pass. Among the ribs and stones, one bright gemstone catches the light. The rest is silent.",
  background_id: BG("bone_field"),
  ambient_audio_prompt: "dry ash wind, faint distant rumble, hollow silence",
  default_props: [],
  pickups: ["rare_gem"],
  counter_tick: { food: 1, water: 1 },
  oracle_hint: "Tap the gem and step back. The field is no place to linger.",
  is_side_quest: false,
  choices: [
    {
      id: "back_to_volcano",
      label: "Step back to the volcano base",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "the path back is short and clear",
    },
  ],
};

// Crystal chamber: side trip from cave_shortcut. Gated by lantern (the
// inbound choice on cave_shortcut already enforces this). Pickup is the
// glowstone, which has no coin value but softens the dragon_chamber
// narration. One way out: back to cave_shortcut.
const CRYSTAL_CHAMBER: StoryScene = {
  id: SCENE.crystal_chamber,
  title: "The Crystal Chamber",
  narration:
    "Your lantern catches a thousand crystals along the cave walls. The chamber glows blue and white. In the center, on a small ledge, one stone glows warm amber, steady and gentle, unlike the cool light around it.",
  background_id: BG("crystal_chamber"),
  ambient_audio_prompt: "soft humming crystals, faint cave drips, distant warm tone",
  default_props: [],
  pickups: ["glowstone"],
  counter_tick: { food: 1 },
  oracle_hint:
    "Tap the warm stone. Slip it into your pocket. The dragon may notice the difference.",
  is_side_quest: false,
  choices: [
    {
      id: "back_to_cave",
      label: "Return to the cave",
      next_scene_id: SCENE.cave_shortcut,
      interactable_kind: "path",
      hint: "the camp and rations wait outside",
    },
  ],
};

// Dragon cubs: convergence scene that all three forward paths feed into
// (lava_chamber, cave_shortcut, ash_road). Three forward solutions
// (sneak, food, coins) lead to dragon_chamber; the kid can also turn
// back to volcano_base for another route. No counter tick: the cubs
// move fast and the moment is short.
const DRAGON_CUBS: StoryScene = {
  id: SCENE.dragon_cubs,
  title: "The Cubs' Antechamber",
  narration:
    "Two small dragon cubs tumble in a rocky antechamber outside the larger cavern. They are playful, but already big. Their teeth are little, but sharp. They have not noticed you yet.",
  background_id: BG("dragon_cubs"),
  ambient_audio_prompt: "playful dragon chirps, scratching claws on stone, distant breath",
  default_props: [],
  pickups: [],
  oracle_hint:
    "Slip past, share a meal, or scatter a few coins. Or step back to find another way.",
  is_side_quest: false,
  choices: [
    {
      id: "sneak_past",
      label: "Sneak past quietly",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "path",
      hint: "stay low, hold your breath",
    },
    {
      id: "feed_cubs",
      label: "Distract them with food",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      requires: ["food_ration"],
      consumes: ["food_ration"],
      hint: "the cubs forget you, focused on the meal",
      oracle_hint:
        "Cubs forget you when they are eating. A ration in the pocket is a quiet pass.",
    },
    {
      id: "bribe_cubs",
      label: "Toss them 50 coins to chase",
      next_scene_id: SCENE.dragon_chamber,
      interactable_kind: "creature",
      coin_cost: 50,
      hint: "the cubs scatter to chase the shiny coins",
    },
    {
      id: "back_to_volcano",
      label: "Turn back to the volcano",
      next_scene_id: SCENE.volcano_base,
      interactable_kind: "path",
      hint: "another path waits up the slope",
    },
  ],
};

// Shrine: optional side trip from forest_path. Coin sink that grants the
// blessing flag, which softens dragon_chamber narration and unlocks the
// ending_blessed branch. No counter tick: a quick stop, kindness only.
const SHRINE: StoryScene = {
  id: SCENE.shrine,
  title: "The Small Shrine",
  narration:
    "A small ancient shrine sits in a clearing off the path. Mossy carvings cover its stones. A shallow bowl in the center waits, empty. Old candles flicker, untended but not gone out.",
  background_id: BG("shrine"),
  ambient_audio_prompt: "soft wind, distant chimes, faint candle hush",
  default_props: [],
  pickups: [],
  oracle_hint:
    "Leave a coin in the bowl, or pass through quietly. Both are answers.",
  is_side_quest: false,
  choices: [
    {
      id: "shrine_offer",
      label: "Speak to the shrine, leave 50 coins",
      next_scene_id: SCENE.forest_path,
      interactable_kind: "sparkle",
      coin_cost: 50,
      sets_flag: FLAG.blessing,
      hint: "the shrine glows; you feel watched over",
    },
    {
      id: "shrine_leave",
      label: "Leave the shrine without paying",
      next_scene_id: SCENE.forest_path,
      interactable_kind: "path",
      hint: "the carved stones watch you go",
    },
  ],
};

// Thief encounter: reachable from ash_road. Three outcomes: pay the
// toll, fight (sword), or run and lose all coins. All three return to
// ash_road. Tick costs one food regardless. Robbed flag is reserved for
// future endings; not used today.
const THIEF_ENCOUNTER: StoryScene = {
  id: SCENE.thief_encounter,
  title: "The Toll Road",
  narration:
    "A hooded traveler steps onto the road. You cannot see their face. Their hand rests easy on a curved knife at their hip. \"This stretch of road has a toll, friend. Cross with kindness, or cross another way.\"",
  background_id: BG("thief_encounter"),
  ambient_audio_prompt: "dry hot wind, soft ash drift, low quiet breath",
  default_props: [],
  pickups: [],
  counter_tick: { food: 1 },
  oracle_hint:
    "Pay the toll. Fight back. Or run and lose your purse. Three honest choices, none easy.",
  is_side_quest: false,
  choices: [
    {
      id: "pay_toll",
      label: "Pay the toll, 100 coins",
      next_scene_id: SCENE.ash_road,
      interactable_kind: "creature",
      coin_cost: 100,
      hint: "the traveler nods, lets you pass",
    },
    {
      id: "fight_thief",
      label: "Fight back with your sword",
      next_scene_id: SCENE.ash_road,
      interactable_kind: "creature",
      requires: ["sword"],
      hint: "the traveler flees",
      oracle_hint:
        "Steel makes the toll lighter. Without a blade, you choose between paying and running.",
    },
    {
      id: "run_dropped_purse",
      label: "Run, drop your purse",
      next_scene_id: SCENE.ash_road,
      interactable_kind: "path",
      sets_flag: FLAG.robbed,
      consumes_counter: { coins: 9999 },
      hint: "you escape but lose everything in your pouch",
    },
  ],
};

// --- endings (each is a real scene with empty choices) ---

const ENDING_STARVATION: StoryScene = {
  id: SCENE.ending_starvation,
  title: "Out of Food",
  narration:
    "You ran out of food before the path ran out of road. The realm tugs you home; even brave adventurers must eat. Tap Play Again, and pack heavier next time, or stop at the Supreme Shop on the way through.",
  background_id: BG("ending_starvation"),
  ambient_audio_prompt: "soft wind, faint distant chimes, slow quiet",
  default_props: [],
  pickups: [],
  is_side_quest: false,
  choices: [],
};

const ENDING_DEHYDRATION: StoryScene = {
  id: SCENE.ending_dehydration,
  title: "Out of Water",
  narration:
    "Your water bottle ran dry and the next spring was too far. The realm tugs you home; even brave adventurers must drink. Tap Play Again, and stock the Supreme Shop on the way through.",
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

// B-014 economy: blessed ending unlocked when the kid left a coin at the
// shrine and grabbed the egg. Sits between Friend and Charmed in tier.
// Reuses ending_appeased.webp as background; no new image required, but
// Vanessa can rerun the generator with a unique prompt later if she wants
// art parity with the other endings.
const ENDING_BLESSED: StoryScene = {
  id: SCENE.ending_blessed,
  title: "Watched Over",
  narration:
    "You walked the road with luck on your side. The shrine you visited stayed warm in your pocket all the way. The egg came home gentle, the dragon stayed her ground, and the wards renewed themselves at first touch. The realm felt watched over from the very first step.",
  background_id: BG("ending_appeased"),
  ambient_audio_prompt: "warm wind, faint chimes, soft golden hush",
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

// B-019: a new earned ending unlocked by a level-5 music box. Reuses
// ending_charmed.webp art (a peaceful dawn) since both endings share the
// "Vex sleeps" beat. Vanessa can rerun the generator with a unique
// prompt later for art parity.
const ENDING_COMPOSER: StoryScene = {
  id: SCENE.ending_composer,
  title: "The Composer",
  narration:
    "You opened the music box you built. The cavern filled with a tune nobody had heard before. Vex closed her eyes and breathed slow. The egg pulsed in time with the song. You walked out into the dawn carrying both the egg and a new song the realm will hum for a hundred years.",
  background_id: BG("ending_charmed"),
  ambient_audio_prompt: "soft dawn wind, gentle music box notes, calm bells",
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
    WOLF_ENCOUNTER,
    WATERFALL_CLIMB,
    EAGLE_NEST,
    BONE_FIELD,
    CRYSTAL_CHAMBER,
    DRAGON_CUBS,
    SHRINE,
    THIEF_ENCOUNTER,
    ENDING_STARVATION,
    ENDING_DEHYDRATION,
    ENDING_LOST,
    ENDING_FRIEND,
    ENDING_CHARMED,
    ENDING_APPEASED,
    ENDING_BLESSED,
    ENDING_COMPOSER,
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
    { id: FLAG.blessing, description: "left a coin at the shrine" },
    { id: FLAG.robbed, description: "ran from the toll road and lost everything" },
    { id: FLAG.composer_masterwork, description: "played a level-5 music box for the dragon" },
    { id: FLAG.music_box_basic, description: "played a basic music box for the dragon" },
    { id: FLAG.snatched_egg, description: "snatched the egg without earning it" },
  ],
  endings: [
    { scene_id: SCENE.ending_starvation, requires: { food_empty: true } },
    { scene_id: SCENE.ending_dehydration, requires: { water_empty: true } },
    // B-019: snatched_egg routes to the existing Snatcher narration but
    // the realm card renders stripped (no ingredients, no coins, no
    // trophies). Ranked above earned endings so that it always wins
    // even if the kid had also tended/sung earlier.
    { scene_id: SCENE.ending_success, requires: { [FLAG.snatched_egg]: true } },
    // B-019: a level-5 music box unlocks the new Composer ending. Ranked
    // above Friend so a tended-and-sung-and-played-masterwork run gets
    // the rarest tier.
    { scene_id: SCENE.ending_composer, requires: { [FLAG.composer_masterwork]: true } },
    {
      scene_id: SCENE.ending_friend,
      requires: { [FLAG.tended_wound]: true, [FLAG.sang_lullaby]: true },
    },
    {
      scene_id: SCENE.ending_blessed,
      requires: { [FLAG.blessing]: true, [FLAG.grabbed_egg]: true },
    },
    { scene_id: SCENE.ending_charmed, requires: { [FLAG.sang_lullaby]: true } },
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.tended_wound]: true } },
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.riddle_answered]: true } },
    // B-019: low-level music box (level 1-2) routes to Appeased.
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.music_box_basic]: true } },
    // B-019: polite take with coins + a non-song token (rare_gem only)
    // still feels earned, so route to Appeased rather than the snatch
    // narration.
    { scene_id: SCENE.ending_appeased, requires: { [FLAG.grabbed_egg]: true } },
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
