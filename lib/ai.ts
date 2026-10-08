import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY && process.env.DISABLE_AI !== "true") {
  console.warn("[backtrack] ANTHROPIC_API_KEY not set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "sk-placeholder",
});

export const MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export const MAX_TOKENS = parseInt(
  process.env.ANTHROPIC_MAX_TOKENS ?? "4096",
  10
);

/** Sanitize user input: strip control chars, trim, normalize whitespace */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

/** Generate a unique roadmap ID */
export function generateRoadmapId(): string {
  return `roadmap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Generate a node ID from title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}
