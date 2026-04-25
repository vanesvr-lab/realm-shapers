// Static blocklist for username validation. Hackathon-grade, not a moderation service.
// Lowercase entries only; matched against the lowercased username.
export const USERNAME_BLOCKLIST: ReadonlySet<string> = new Set([
  "admin", "administrator", "moderator", "mod", "support", "help", "staff",
  "anthropic", "claude", "openai", "supabase",
  "realm", "realmshapers", "realm_shapers", "shaper", "shapers",
  "root", "system", "owner", "official",
  "fuck", "shit", "bitch", "ass", "damn", "crap", "piss",
  "sex", "porn", "nude", "naked", "xxx",
  "kill", "die", "dead", "murder", "rape", "nazi", "hitler",
  "nigger", "faggot", "retard", "slut", "whore",
  "drug", "weed", "cocaine", "heroin",
  "google", "facebook", "tiktok", "youtube", "discord",
  "test", "demo", "user", "guest", "anonymous",
  "null", "undefined", "true", "false", "void",
]);
