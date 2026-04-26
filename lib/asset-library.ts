export type AssetCategory = "backgrounds" | "characters" | "props";

export type AssetDef = {
  id: string;
  category: AssetCategory;
  filename: string;
  alt: string;
  tags: string[];
  prompt: string;
};

const STYLE_SUFFIX =
  "in bright cartoon storybook style, kid friendly, soft pastel colors, clean shapes, simple flat illustration, white background, no text, no letters, no words, no weapons, no scary elements, centered, full body";

const SCENE_STYLE_SUFFIX =
  "in bright cartoon storybook style, kid friendly, soft pastel colors, clean shapes, simple flat illustration, no text, no letters, no words, no people, no characters, wide landscape composition, gentle and inviting";

// Shared with the placeholder/sync scripts. Default to .svg; the sync script
// flips entries to .png as real Replicate-generated images land on disk.
import { ASSET_FILE_EXTENSIONS } from "./asset-files.generated";

function ext(id: string): "svg" | "png" {
  return (ASSET_FILE_EXTENSIONS as Record<string, "svg" | "png">)[id] ?? "svg";
}

function bg(id: string, alt: string, prompt: string, tags: string[] = []): AssetDef {
  return {
    id,
    category: "backgrounds",
    filename: `${id}.${ext(id)}`,
    alt,
    tags,
    prompt: `${prompt}, ${SCENE_STYLE_SUFFIX}`,
  };
}

function character(id: string, alt: string, prompt: string, tags: string[] = []): AssetDef {
  return {
    id,
    category: "characters",
    filename: `${id}.${ext(id)}`,
    alt,
    tags,
    prompt: `${prompt}, ${STYLE_SUFFIX}`,
  };
}

function prop(id: string, alt: string, prompt: string, tags: string[] = []): AssetDef {
  return {
    id,
    category: "props",
    filename: `${id}.${ext(id)}`,
    alt,
    tags,
    prompt: `a single ${prompt}, ${STYLE_SUFFIX}`,
  };
}

export const BACKGROUNDS: AssetDef[] = [
  bg("forest", "Sunlit forest clearing", "a sunlit forest clearing with tall friendly trees and dappled light"),
  bg("beach", "Sandy beach with gentle waves", "a sandy beach with gentle blue waves and a few seashells"),
  bg("underwater", "Underwater coral garden", "an underwater coral garden with colorful fish and gentle bubbles"),
  bg("desert", "Soft dunes desert", "a warm desert with rolling soft dunes and a single cactus"),
  bg("castle_courtyard", "Castle courtyard", "a friendly castle courtyard with stone walls and pennant flags"),
  bg("space", "Cosmic starry space", "a calm starry space scene with planets and shooting stars"),
  bg("mountain_peak", "Snowy mountain peak", "a snowy mountain peak under a clear blue sky"),
  bg("cave", "Cozy crystal cave", "a cozy glowing crystal cave with friendly purple light"),
  bg("volcano", "Distant gentle volcano", "a distant friendly volcano with a small smoke puff and orange sky"),
  bg("swamp", "Misty swamp", "a misty green swamp with lily pads and gentle fog"),
  bg("library", "Magical library", "a magical library with tall bookshelves and warm lamplight"),
  bg("town_square", "Cobblestone town square", "a small cobblestone town square with cottages and a fountain"),
  bg("snowy_tundra", "Snowy tundra", "a snowy tundra with soft pine trees and gentle snowfall"),
  bg("garden", "Flower garden", "a colorful flower garden with butterflies and a small path"),
  bg("sky_kingdom", "Floating sky kingdom", "a floating sky kingdom with cloud islands and rainbow bridges"),
];

export const CHARACTERS: AssetDef[] = [
  character("hero_girl", "Brave hero girl", "a brave young hero girl with a green cape, smiling"),
  character("hero_boy", "Brave hero boy", "a brave young hero boy with a blue cape, smiling"),
  character("dragon", "Friendly dragon", "a small friendly purple dragon with tiny wings"),
  character("robot", "Cute robot", "a cute round friendly robot with antennae and big eyes"),
  character("wizard", "Young wizard", "a young wizard with a starry purple hat and a soft glowing orb"),
  character("knight", "Friendly knight", "a friendly knight in shiny silver armor with a kind smile, no weapon"),
  character("princess", "Royal princess", "a royal princess in a flowing pink dress with a small crown"),
  character("alien", "Cheerful alien", "a cheerful green alien with three eyes and a wide grin"),
  character("fairy", "Sparkly fairy", "a sparkly fairy with translucent wings and a flower dress"),
  character("mermaid", "Mermaid friend", "a friendly mermaid with a teal tail and seashell hair clips"),
  character("octopus", "Octopus librarian", "a friendly purple octopus wearing round glasses"),
  character("fox", "Clever fox", "a clever orange fox standing upright with a fluffy tail"),
  character("wolf", "Gentle wolf", "a gentle gray wolf standing upright with a kind expression"),
  character("bear", "Cuddly bear", "a cuddly brown bear standing upright with a scarf"),
  character("owl", "Wise owl", "a wise round owl with big golden eyes and a tiny scroll"),
  character("cat", "Magical cat", "a magical black cat with big sparkly eyes and a star collar"),
  character("dog", "Loyal puppy", "a loyal small puppy with floppy ears, sitting"),
  character("ghost", "Friendly ghost", "a friendly small white ghost with a sweet smile"),
  character("pirate", "Kid pirate", "a kid pirate with a striped shirt and a tricorn hat, no weapon"),
  character("ninja", "Stealth ninja", "a kid ninja in soft blue clothes, sneaking, no weapon"),
  character("astronaut", "Astronaut explorer", "a small astronaut in a white spacesuit, helmet on, waving"),
  character("scientist", "Curious scientist", "a curious kid scientist in a lab coat holding a beaker"),
  character("chef", "Happy chef", "a happy chef in a tall white hat holding a wooden spoon"),
  character("musician", "Musical kid", "a musical kid playing a small flute with notes floating above"),
  character("gardener", "Gardener kid", "a gardener kid with a sun hat holding a watering can"),
  character("librarian", "Kind librarian", "a kind librarian in a vest holding an open book"),
  character("oracle", "Mystical oracle", "a mystical oracle in flowing robes with starry sleeves"),
  character("witch", "Friendly witch", "a friendly young witch with a pointy hat and striped stockings"),
  character("troll", "Gentle troll", "a gentle big-nosed troll with mossy hair and a sweet smile"),
  character("butterfly_person", "Butterfly person", "a tiny person with large rainbow butterfly wings"),
];

export const PROPS: AssetDef[] = [
  prop("tree", "Tree", "leafy tree"),
  prop("rock", "Rock", "smooth gray rock"),
  prop("treasure_chest", "Treasure chest", "wooden treasure chest with gold trim, closed"),
  prop("sword", "Toy sword", "wooden toy sword with a star tip"),
  prop("magic_wand", "Magic wand", "magic wand with a glowing star tip"),
  prop("key", "Brass key", "old brass key"),
  prop("crown", "Gold crown", "gold crown with three colorful gems"),
  prop("gem", "Sparkly gem", "sparkly blue gem"),
  prop("scroll", "Paper scroll", "rolled paper scroll with a red ribbon"),
  prop("book", "Storybook", "thick storybook with a star on the cover"),
  prop("lantern", "Glowing lantern", "warmly glowing lantern with a candle inside"),
  prop("mushroom", "Red mushroom", "red toadstool mushroom with white spots"),
  prop("flower", "Pink flower", "pink daisy flower with a smiling center"),
  prop("fish", "Cute fish", "cute orange fish with big eyes"),
  prop("bird", "Songbird", "cheerful blue songbird"),
  prop("sun", "Smiling sun", "smiling yellow sun with rays"),
  prop("moon", "Crescent moon", "smiling crescent moon"),
  prop("star", "Twinkling star", "twinkling gold star"),
  prop("cloud", "Fluffy cloud", "fluffy white cloud"),
  prop("campfire", "Campfire", "small cozy campfire with logs"),
  prop("water_drop", "Water drop", "shiny water drop"),
  prop("ice_crystal", "Ice crystal", "pale blue ice crystal"),
  prop("portal", "Magic portal", "swirling purple magic portal ring"),
  prop("signpost", "Signpost", "wooden signpost with a blank arrow board, no text"),
  prop("tent", "Camping tent", "small striped camping tent"),
  prop("bridge", "Wooden bridge", "small wooden plank bridge"),
  prop("ladder", "Wooden ladder", "wooden ladder"),
  prop("door", "Wooden door", "round wooden door with iron hinges"),
  prop("window_frame", "Window frame", "small window frame with shutters"),
  prop("fence", "Picket fence", "white picket fence section"),
  prop("well", "Stone well", "small stone water well with a roof"),
  prop("statue", "Stone statue", "smiling small stone statue of a friendly creature"),
  prop("cauldron", "Bubbling cauldron", "black cauldron bubbling with gentle blue light"),
  prop("potion", "Potion bottle", "glass potion bottle with pink liquid and a cork"),
  prop("map", "Treasure map", "rolled paper treasure map with a tiny X mark, no text"),
  prop("compass", "Brass compass", "round brass compass with a needle"),
  prop("telescope", "Brass telescope", "small brass telescope"),
  prop("hourglass", "Hourglass", "small wooden hourglass with golden sand"),
  prop("mirror", "Hand mirror", "ornate gold hand mirror"),
  prop("throne", "Royal throne", "small royal velvet throne"),
  prop("drum", "Hand drum", "small hand drum with a strap"),
  prop("flute", "Wooden flute", "small wooden flute"),
  prop("painting", "Framed painting", "framed painting of a tiny landscape, no text"),
  prop("basket", "Picnic basket", "wicker picnic basket with a checkered cloth"),
  prop("bag", "Travel bag", "small leather travel satchel"),
  prop("ribbon", "Silk ribbon", "swirly pink silk ribbon"),
  prop("candle", "Candle", "lit white candle"),
  prop("lock", "Iron lock", "old iron padlock"),
  prop("fountain", "Stone fountain", "small stone fountain with sparkling water"),
  prop("ship_sail", "Sailboat", "small sailboat with a white sail"),
];

export const ASSET_LIBRARY: AssetDef[] = [
  ...BACKGROUNDS,
  ...CHARACTERS,
  ...PROPS,
];

export const ASSETS_BY_ID: Record<string, AssetDef> = Object.fromEntries(
  ASSET_LIBRARY.map((a) => [a.id, a])
);

export const BACKGROUND_IDS = BACKGROUNDS.map((b) => b.id);
export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);
export const PROP_IDS = PROPS.map((p) => p.id);

export function isValidBackgroundId(id: string): boolean {
  return BACKGROUND_IDS.includes(id);
}
export function isValidCharacterId(id: string): boolean {
  return CHARACTER_IDS.includes(id);
}
export function isValidPropId(id: string): boolean {
  return PROP_IDS.includes(id);
}

export function assetUrl(asset: AssetDef): string {
  return `/assets/${asset.category}/${asset.filename}`;
}

export function assetUrlById(id: string): string | null {
  const a = ASSETS_BY_ID[id];
  return a ? assetUrl(a) : null;
}
