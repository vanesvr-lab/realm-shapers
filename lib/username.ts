import { USERNAME_BLOCKLIST } from "./username-blocklist";

export type UsernameValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export function validateUsername(input: string): UsernameValidationResult {
  const lowered = input.toLowerCase().trim();
  if (lowered.length === 0) {
    return { ok: false, error: "Pick a username." };
  }
  if (!USERNAME_REGEX.test(lowered)) {
    return {
      ok: false,
      error: "Use 3 to 20 lowercase letters, numbers, or underscores.",
    };
  }
  if (USERNAME_BLOCKLIST.has(lowered)) {
    return { ok: false, error: "That name is reserved. Pick another." };
  }
  return { ok: true, value: lowered };
}
