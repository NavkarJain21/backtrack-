import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL, MAX_TOKENS, sanitizeInput } from "@/lib/ai";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import {
  NodeDetailRequestSchema,
  NodeDetailResponseSchema,
  type NodeDetailResponse,
} from "@/lib/schemas";
import { z } from "zod";

const DISABLE_AI = process.env.DISABLE_AI === "true";

const NODE_DETAIL_TOOL = {
  name: "generate_node_detail",
  description: "Generate personalized action pack for a learning node",
  input_schema: {
    type: "object" as const,
    required: ["why", "actionItems", "resources", "searchQuery"],
    properties: {
      why: {
        type: "string",
        description: "2-3 sentences explaining exactly why this skill is critical for the user's specific goal",
      },
      actionItems: {
        type: "array",
        description: "5-8 specific, actionable learning tasks with checkboxes",
        items: {
          type: "object",
          required: ["id", "text", "completed"],
          properties: {
            id: { type: "string" },
            text: { type: "string", description: "Specific action to take (e.g., 'Complete 3 exercises on arrays in LeetCode')" },
            completed: { type: "boolean" },
          },
        },
      },
      resources: {
        type: "array",
        description: "3-6 high-quality learning resources",
        items: {
          type: "object",
          required: ["title", "url", "type"],
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            type: { type: "string", enum: ["video", "article", "docs", "course", "tool", "repo"] },
          },
        },
      },
      searchQuery: {
        type: "string",
        description: "Optimized search query for finding more resources on this topic (e.g., 'python pandas dataframe tutorial 2024')",
      },
    },
  },
};

function mockNodeDetail(nodeTitle: string, goal: string): NodeDetailResponse {
  return {
    why: `${nodeTitle} is a foundational skill directly required for ${goal}. Without mastering this, you cannot effectively build on the subsequent skills in your roadmap. Most senior professionals in this field cite this as one of their most critical competencies.`,
    actionItems: [
      { id: "a1", text: `Complete beginner tutorial for ${nodeTitle}`, completed: false },
      { id: "a2", text: "Build a small project applying this skill", completed: false },
      { id: "a3", text: "Read official documentation and take notes", completed: false },
      { id: "a4", text: "Complete 5 practice exercises", completed: false },
      { id: "a5", text: "Join a community and ask 1 question", completed: false },
    ],
    resources: [
      {
        title: `Official ${nodeTitle} Documentation`,
        url: "https://developer.mozilla.org",
        type: "docs",
      },
      {
        title: `${nodeTitle} Full Course`,
        url: "https://youtube.com",
        type: "video",
      },
      {
        title: `${nodeTitle} for ${goal} - Medium`,
        url: "https://medium.com",
        type: "article",
      },
    ],
    searchQuery: `${nodeTitle} tutorial for ${goal} 2024`,
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = rateLimit(ip, "node-detail");
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

  const parsed = NodeDetailRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { nodeId, nodeTitle, nodeDescription, goal, phase, tags } = parsed.data;
  const safeGoal = sanitizeInput(goal);
  const safeTitle = sanitizeInput(nodeTitle);

  if (DISABLE_AI) {
    return NextResponse.json(mockNodeDetail(safeTitle, safeGoal));
  }

  const systemPrompt = `You are an expert learning coach. Generate highly personalized, specific, actionable learning guidance. 
Every recommendation must be DIRECTLY relevant to the user's stated goal. Never give generic advice.
For resource URLs, use real, well-known URLs (e.g., docs.python.org, reactjs.org, youtube.com search URLs, github.com).`;

  const userPrompt = `Generate a detailed action pack for learning: "${safeTitle}"

Context:
- This is Phase ${phase} of their roadmap
- Their goal: "${safeGoal}"
- Node description: "${sanitizeInput(nodeDescription)}"
- Tags: ${tags?.join(", ") ?? "none"}

Provide:
1. Why this specific skill is critical for "${safeGoal}" (2-3 sentences, be specific)
2. 6-8 actionable learning tasks (specific, measurable, not vague)
3. 4-6 real learning resources with actual URLs
4. An optimized Google/YouTube search query for this topic`;

  let detail: NodeDetailResponse | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: [NODE_DETAIL_TOOL],
        tool_choice: { type: "tool", name: "generate_node_detail" },
        messages: [{ role: "user", content: userPrompt }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "No tool output";
        continue;
      }

      const raw = toolUse.input as unknown;
      const validated = NodeDetailResponseSchema.safeParse(raw);
      if (!validated.success) {
        lastError = validated.error.message;
        continue;
      }

      // Add IDs to action items if missing
      const detailWithIds: NodeDetailResponse = {
        ...validated.data,
        actionItems: validated.data.actionItems.map((item, i) => ({
          ...item,
          id: item.id || `${nodeId}_action_${i}`,
        })),
      };

      detail = detailWithIds;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  if (!detail) {
    console.error("[node-detail] AI failed:", lastError);
    detail = mockNodeDetail(safeTitle, safeGoal);
  }

  return NextResponse.json(detail);
}
