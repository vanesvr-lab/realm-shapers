// Hand-authored adventure registry types. An Adventure is a thin wrapper
// around StoryTree that gives the registry a stable id distinct from the
// tree's title. The story field carries the full StoryTree, including the
// new optional fields (prologue, counter_defs, starter_choices) that live
// on StoryTree itself per the adventure-slice plan. PlayClient and
// /api/generate consume StoryTree directly; the Adventure wrapper is only
// used at the lib/adventures/ boundary to register and look up entries.

import type { StoryTree } from "@/lib/claude";

export type Adventure = {
  id: string;
  story: StoryTree;
};
