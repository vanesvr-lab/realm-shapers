import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type WorldIngredients = {
  setting: string;
  character: string;
  goal: string;
  twist: string;
};

export type GeneratedWorld = {
  title: string;
  narration: string;
};

export async function generateWorld(
  ingredients: WorldIngredients
): Promise<GeneratedWorld> {
  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: buildPrompt(ingredients),
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("");

  return parseWorldResponse(text);
}

function buildPrompt(i: WorldIngredients): string {
  return `You are the Oracle in a creative game called Realm Shapers. A young player has given you four ingredients to shape a world. Generate a short, evocative world description.

Ingredients:
- Setting: ${i.setting}
- Character: ${i.character}
- Goal: ${i.goal}
- Twist: ${i.twist}

Respond ONLY with JSON in this exact shape, no preamble or markdown:
{
  "title": "A short evocative title for this realm",
  "narration": "2-3 sentences narrating the world to the player. Warm, magical, age-appropriate for an 11-year-old."
}`;
}

function parseWorldResponse(raw: string): GeneratedWorld {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.title || !parsed.narration) {
    throw new Error("Invalid world response from Claude");
  }
  return parsed as GeneratedWorld;
}
