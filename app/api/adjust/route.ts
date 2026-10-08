import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL, MAX_TOKENS, sanitizeInput } from "@/lib/ai";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import {
  AdjustRoadmapRequestSchema,
  AdjustRoadmapResponseSchema,
  type AdjustRoadmapResponse,
} from "@/lib/schemas";

const DISABLE_AI = process.env.DISABLE_AI === "true";

const ADJUST_TOOL = {
  name: "adjust_roadmap",
  description: "Adjust a roadmap based on skills the user already knows",
  input_schema: {
    type: "object" as const,
    required: ["matchedNodeIds", "patches", "summary"],
    properties: {
      matchedNodeIds: {
        type: "array",
        items: { type: "string" },
        description: "IDs of existing nodes that match skills the user claims to know",
      },
      patches: {
        type: "array",
        description: "List of changes to apply to the roadmap",
        items: {
          type: "object",
          required: ["id", "action"],
          properties: {
            id: { type: "string", description: "Node ID to act on" },
            action: {
              type: "string",
              enum: ["mark_known", "remove", "add", "update"],
              description: "mark_known = user already knows this; remove = no longer needed; add = new accelerated path node; update = modify existing node",
            },
            node: {
              type: "object",
              description: "Required for 'add' action - the new node definition",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                phase: { type: "number" },
                dependencies: { type: "array", items: { type: "string" } },
                estimatedHours: { type: "number" },
                tags: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      summary: {
        type: "string",
        description: "Brief explanation of changes made (1-3 sentences)",
      },
    },
  },
};

function mockAdjust(statement: string, nodeIds: string[]): AdjustRoadmapResponse {
  const firstId = nodeIds[0] ?? "unknown";
  return {
    matchedNodeIds: nodeIds,
    patches: nodeIds.map((id) => ({ id, action: "mark_known" as const })),
    summary: `Based on "${statement}", I've marked ${nodeIds.length} node(s) as already known. Your roadmap has been updated to reflect your existing knowledge.`,
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = rateLimit(ip, "adjust");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AdjustRoadmapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { statement, currentRoadmap } = parsed.data;
  const safeStatement = sanitizeInput(statement);

  // Build context for AI
  const nodeList = currentRoadmap.nodes
    .map((n) => `- ID: "${n.id}" | Title: "${n.title}" | Phase: ${n.phase} | Tags: ${n.tags.join(", ")}`)
    .join("\n");

  if (DISABLE_AI) {
    // Intelligent keyword and tag matching for offline mode
    const lower = safeStatement.toLowerCase();
    const matched = currentRoadmap.nodes
      .filter((n) => {
        const titleMatch = n.title
          .toLowerCase()
          .split(/[\s,&/]+/)
          .some((w) => w.length >= 3 && lower.includes(w));
        const tagMatch = n.tags.some((t) => lower.includes(t.toLowerCase()));
        const idMatch = lower.includes(n.id.toLowerCase().replace(/_/g, " "));
        return titleMatch || tagMatch || idMatch;
      })
      .map((n) => n.id)
      .slice(0, 4);

    return NextResponse.json(mockAdjust(safeStatement, matched));
  }

  const systemPrompt = `You are a smart roadmap advisor. When a user says they already know certain skills, you must:
1. Identify which existing roadmap nodes correspond to their claimed knowledge
2. Mark those nodes as known (they won't need to study them)
3. Consider if any nodes should be removed (now redundant) or accelerated
4. NEVER remove the user's final goal node or nodes in the highest phase
5. NEVER add nodes that would create circular dependencies
6. Keep the roadmap coherent and achievable`;

  const userPrompt = `The user says: "${safeStatement}"

Current roadmap goal: "${sanitizeInput(currentRoadmap.goal)}"

Current roadmap nodes:
${nodeList}

Based on what the user knows, determine which nodes to mark as known, which to potentially remove or simplify, and whether any new accelerated-path nodes should be added.

Important rules:
- Only reference node IDs that exist in the list above
- Do not remove nodes from phases 4-6 unless they are directly covered by the user's statement
- Prefer "mark_known" over "remove" when uncertain`;

  let result: AdjustRoadmapResponse | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools: [ADJUST_TOOL],
        tool_choice: { type: "tool", name: "adjust_roadmap" },
        messages: [{ role: "user", content: userPrompt }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "No tool output";
        continue;
      }

      const raw = toolUse.input as unknown;
      const validated = AdjustRoadmapResponseSchema.safeParse(raw);
      if (!validated.success) {
        lastError = validated.error.message;
        continue;
      }

      // Validate: only reference existing node IDs for mark_known/remove/update
      const existingIds = new Set(currentRoadmap.nodes.map((n) => n.id));
      const safePatch = validated.data.patches.filter((p) => {
        if (p.action === "add") return true; // add creates new
        return existingIds.has(p.id);
      });

      result = { ...validated.data, patches: safePatch };
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  if (!result) {
    console.error("[adjust] AI failed:", lastError);
    const matched = currentRoadmap.nodes
      .filter((n) => {
        const lower = safeStatement.toLowerCase();
        return n.title.toLowerCase().split(/\s+/).some((w) => w.length > 3 && lower.includes(w));
      })
      .map((n) => n.id)
      .slice(0, 3);
    result = mockAdjust(safeStatement, matched);
  }

  return NextResponse.json(result);
}
