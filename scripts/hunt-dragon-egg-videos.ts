// Hunt the Dragon's Egg, video prompts. Animates a still scene background
// (.webp) into a short looped MP4 entry video. The renderer plays the
// video once on first scene entry per playthrough and crossfades to the
// static image when it ends; same pattern as the B-013 drawbridge pilot.
// B-015 (morning) will wire StoryScene.entry_video_path so adventure
// scenes can declare these. Generation can run independently of that.

export type VideoJob = {
  id: string;
  source_image: string; // relative to project root
  output_path: string; // relative to project root
  prompt: string;
};

export const HUNT_DRAGON_EGG_VIDEOS: VideoJob[] = [
  {
    id: "dragon_chamber",
    source_image: "public/adventures/hunt-dragon-egg/dragon_chamber.webp",
    output_path: "public/adventures/hunt-dragon-egg/dragon_chamber_entry.mp4",
    prompt:
      "the mother dragon breathes slowly, scales subtly catching the warm glow of the egg, eye half open and watchful, very slow camera push in, no characters speaking, no text, painterly storybook tone",
  },
  {
    id: "volcano_base_speaks",
    source_image: "public/adventures/hunt-dragon-egg/volcano_base_speaks.webp",
    output_path: "public/adventures/hunt-dragon-egg/volcano_base_speaks_entry.mp4",
    prompt:
      "the great stone eye in the rockface slowly cracks open and glows red from within, fissures of orange light spreading along the cracks, ash drifts in the air, low rumble feel, subtle slow camera, no text, painterly storybook tone",
  },
  {
    id: "lava_river_crossing",
    source_image: "public/adventures/hunt-dragon-egg/lava_river_crossing.webp",
    output_path: "public/adventures/hunt-dragon-egg/lava_river_crossing_entry.mp4",
    prompt:
      "a slow river of bright orange lava flows steadily across a rocky path, hot air shimmer rises, small glowing embers float upward, the cooled obsidian rocks loom dark, subtle slow camera, no characters, no text, painterly storybook tone",
  },
  {
    id: "dark_cavern",
    source_image: "public/adventures/hunt-dragon-egg/dark_cavern.webp",
    output_path: "public/adventures/hunt-dragon-egg/dark_cavern_entry.mp4",
    prompt:
      "the darkness at the cave mouth slowly stirs, hints of motion just past the edge of visible light, very subtle wind from inside, very slow camera push in, eerie hush, no characters, no text, painterly storybook tone",
  },
  {
    id: "forest_riddle",
    source_image: "public/adventures/hunt-dragon-egg/forest_riddle.webp",
    output_path: "public/adventures/hunt-dragon-egg/forest_riddle_entry.mp4",
    prompt:
      "an ancient oak with a face in its bark slowly opens one stone eye, bark shifts subtly, dappled sunlight shifts as the wind moves the leaves above, no characters, no text, painterly storybook tone",
  },
];
