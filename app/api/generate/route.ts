import { NextRequest, NextResponse } from "next/server";
import { anthropic, MODEL, MAX_TOKENS, sanitizeInput, generateRoadmapId } from "@/lib/ai";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import {
  GenerateRoadmapRequestSchema,
  RoadmapSchema,
  type RoadmapNode,
} from "@/lib/schemas";
import { z } from "zod";

const DISABLE_AI = process.env.DISABLE_AI === "true";

// Minimum nodes for a credible production roadmap. Outputs below this are
// retried, never silently served as a successful AI-generated roadmap.
const MIN_ROADMAP_NODES = 12;

const ROADMAP_TOOL = {
  name: "generate_roadmap",
  description:
    "Generate a personalized dependency-graph career roadmap with skills, projects, and a final goal",
  input_schema: {
    type: "object" as const,
    properties: {
      nodes: {
        type: "array",
        description:
          "Ordered list of 16-24 roadmap nodes: skill nodes, 2-3 project nodes, role/credential nodes where relevant, and exactly one final goal node",
        items: {
          type: "object",
          required: ["id", "title", "description", "phase", "dependencies", "estimatedHours", "tags"],
          properties: {
            id: { type: "string", description: "Unique snake_case identifier" },
            title: { type: "string", description: "Short node name specific to the goal (max 60 chars). Project nodes must read as buildable artifacts, e.g. 'Realtime Chat API with WebSockets'" },
            description: { type: "string", description: "2-3 sentence description of what this node is and why it matters for the goal (max 300 chars)" },
            phase: { type: "number", description: "Learning phase 1-6. Phase 1 = foundations. Skill nodes across all phases; project nodes in mid/late phases (3+); the final goal node in the highest phase" },
            dependencies: {
              type: "array",
              items: { type: "string" },
              description: "IDs of nodes that must be completed before this one. Project nodes must depend on the skill nodes they require; the final goal node depends on the projects. Include branches (one node unlocking several) and merges (one node requiring several)",
            },
            estimatedHours: { type: "number", description: "Estimated study/practice hours" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "2-5 short category tags. Use 'project', 'portfolio' or 'capstone' for project nodes, 'interview'/'career' for role nodes, 'certification'/'credential' for credential nodes, skill topics otherwise",
            },
          },
        },
      },
    },
    required: ["nodes"],
  },
};

// Development/offline mock. Deliberately generic (goal name is interpolated,
// never a hardcoded career) and shaped like the real product contract:
// skills across phases, 2 project nodes with skill prerequisites, a role
// node, a credential node, and one terminal goal node.
function mockRoadmap(goal: string): RoadmapNode[] {
  return [
    // ── Phase 1: foundations (no dependencies) ──
    {
      id: "core_foundations",
      title: `Core Foundations for ${goal}`,
      description: `Establish the fundamental knowledge base required for ${goal}.`,
      phase: 1,
      dependencies: [],
      estimatedHours: 30,
      status: "available",
      tags: ["foundation"],
    },
    {
      id: "tooling_workflow",
      title: "Essential Tooling & Workflow",
      description: `Set up version control, editors, and daily workflow habits used throughout ${goal}.`,
      phase: 1,
      dependencies: [],
      estimatedHours: 20,
      status: "available",
      tags: ["tools", "workflow"],
    },
    {
      id: "domain_concepts",
      title: `Domain Concepts for ${goal}`,
      description: `Learn the core vocabulary, standards, and mental models behind ${goal}.`,
      phase: 1,
      dependencies: [],
      estimatedHours: 25,
      status: "available",
      tags: ["domain", "concepts"],
    },
    // ── Phase 2: intermediate (branches from foundations) ──
    {
      id: "intermediate_skills",
      title: `Intermediate Skills for ${goal}`,
      description: `Build practical intermediate skills that bridge foundations to specialization for ${goal}.`,
      phase: 2,
      dependencies: ["core_foundations"],
      estimatedHours: 40,
      status: "locked",
      tags: ["intermediate"],
    },
    {
      id: "structured_practice",
      title: "Structured Practice & Problem Sets",
      description: `Reinforce fundamentals with graded exercises and problem sets relevant to ${goal}.`,
      phase: 2,
      dependencies: ["core_foundations", "tooling_workflow"],
      estimatedHours: 35,
      status: "locked",
      tags: ["practice", "problems"],
    },
    {
      id: "data_fundamentals",
      title: `Working with Data for ${goal}`,
      description: `Collect, clean, and interpret the data formats most common in ${goal}.`,
      phase: 2,
      dependencies: ["domain_concepts"],
      estimatedHours: 30,
      status: "locked",
      tags: ["data"],
    },
    // ── Phase 3: specialization + first project (merge) ──
    {
      id: "specialization",
      title: `Core Specialization for ${goal}`,
      description: `Deep-dive into the primary competencies needed for ${goal}.`,
      phase: 3,
      dependencies: ["intermediate_skills", "data_fundamentals"],
      estimatedHours: 50,
      status: "locked",
      tags: ["specialization"],
    },
    {
      id: "guided_project",
      title: `Guided Project: ${goal} Starter Build`,
      description: `Build a scoped, well-specified starter project applying intermediate skills toward ${goal}.`,
      phase: 3,
      dependencies: ["intermediate_skills", "structured_practice"],
      estimatedHours: 45,
      status: "locked",
      tags: ["project"],
    },
    // ── Phase 4: advanced + portfolio project, role, credential ──
    {
      id: "advanced_systems",
      title: `Advanced Systems for ${goal}`,
      description: `Tackle architecture, scale, and edge cases expected of a professional ${goal}.`,
      phase: 4,
      dependencies: ["specialization"],
      estimatedHours: 55,
      status: "locked",
      tags: ["advanced", "architecture"],
    },
    {
      id: "portfolio_project",
      title: `Portfolio Project: ${goal} End-to-End Build`,
      description: `Design, build, test, and deploy a complete portfolio piece demonstrating readiness for ${goal}.`,
      phase: 4,
      dependencies: ["guided_project", "specialization"],
      estimatedHours: 70,
      status: "locked",
      tags: ["project", "portfolio"],
    },
    {
      id: "interview_prep",
      title: `Interview Preparation for ${goal}`,
      description: `Practice role-specific interview questions, portfolio walkthroughs, and communication for ${goal}.`,
      phase: 4,
      dependencies: ["guided_project"],
      estimatedHours: 20,
      status: "locked",
      tags: ["interview", "career"],
    },
    {
      id: "certification",
      title: `Relevant Certification for ${goal}`,
      description: `Prepare for a recognized credential that validates skills for ${goal}.`,
      phase: 4,
      dependencies: ["specialization"],
      estimatedHours: 30,
      status: "locked",
      tags: ["certification"],
    },
    // ── Phase 5: terminal goal (merges projects + advanced work) ──
    {
      id: "capstone_goal",
      title: `Capstone: Production-Ready ${goal} Showcase`,
      description: `Ship a production-quality capstone proving end-to-end mastery for ${goal}.`,
      phase: 5,
      dependencies: ["portfolio_project", "advanced_systems"],
      estimatedHours: 80,
      status: "locked",
      tags: ["capstone", "portfolio"],
    },
  ];
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = rateLimit(ip, "generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateRoadmapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const goal = sanitizeInput(parsed.data.goal);

  if (DISABLE_AI) {
    console.warn(
      "[generate] DISABLE_AI=true — serving mock roadmap for development. Unset DISABLE_AI and set ANTHROPIC_API_KEY to exercise the real AI generation path."
    );
    const nodes = mockRoadmap(goal);
    const now = new Date().toISOString();
    const roadmap = {
      id: generateRoadmapId(),
      goal,
      nodes,
      createdAt: now,
      updatedAt: now,
    };
    return NextResponse.json({
      roadmap,
      meta: { source: "mock", reason: "DISABLE_AI is enabled" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[generate] ANTHROPIC_API_KEY is not configured — serving mock roadmap. Set ANTHROPIC_API_KEY in .env.local to use real AI generation."
    );
    const nodes = mockRoadmap(goal);
    const now = new Date().toISOString();
    const roadmap = {
      id: generateRoadmapId(),
      goal,
      nodes,
      createdAt: now,
      updatedAt: now,
    };
    return NextResponse.json({
      roadmap,
      meta: { source: "mock", reason: "ANTHROPIC_API_KEY is not configured" },
    });
  }

  const systemPrompt = `You are a world-class career coach and curriculum designer. Your job is to create highly personalized, dependency-based learning roadmaps that produce PORTFOLIO EVIDENCE, not just learning recommendations.

When given a specific career goal, you MUST:
1. Generate 16-24 nodes tailored EXACTLY to that goal: multiple skill nodes, 2-3 project nodes, role/credential nodes where genuinely relevant, and exactly one final goal node
2. Place project nodes in mid/late phases (3+) and make each depend on the skill nodes it requires
3. Make the final goal node terminal (nothing depends on it) in the highest phase, depending on the projects and advanced skills
4. Create realistic dependency chains with branches (one node unlocking several) and merges (one node requiring several)
5. Organize nodes into 4-6 learning phases
6. Make every node SPECIFIC to the user's goal, not generic — no generic project filler
7. Ensure IDs are unique snake_case strings
8. Vary phase durations realistically

CRITICAL: Never create generic "Programming Basics" nodes unless they are genuinely required. Make every node laser-focused on the stated goal. A roadmap without project nodes is an incomplete roadmap.`;

  const userPrompt = `Create a comprehensive, personalized learning roadmap for this SPECIFIC goal: "${goal}"

Requirements:
- 16-24 nodes total (never fewer than 12)
- 4-6 phases (Phase 1 = absolute foundations, Phase 6 = advanced/expert)
- Multiple skill nodes across all phases, each DIRECTLY relevant to: "${goal}"
- 2-3 PROJECT nodes in phases 3+: concrete, buildable, career-specific artifacts (bad: "Build a Project", good: "Realtime Chat API with WebSockets"). Each project MUST depend on the skill nodes it requires. Tag project nodes with 'project' and/or 'portfolio'/'capstone'
- Exactly ONE final goal node: terminal (no other node depends on it), in the highest phase, depending on the projects and advanced skills
- Role nodes (tag 'interview'/'career') and credential nodes (tag 'certification'/'credential') only where genuinely relevant to the goal
- Dependencies must create a logical learning progression with branches and merges
- EstimatedHours should be realistic (5-200 hours per node)
- Tags should reflect the node kind and skill category
- Titles must be specific (bad: "Basics", good: "Python for Data Science Fundamentals")
- Descriptions must explain WHY this node matters for the stated goal`;

  let nodes: RoadmapNode[] | null = null;
  let lastError: string | null = null;

  // Try up to 2 times
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        tools: [ROADMAP_TOOL],
        tool_choice: { type: "tool", name: "generate_roadmap" },
        messages: [{ role: "user", content: userPrompt }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        lastError = "AI did not return tool output";
        continue;
      }

      const rawInput = toolUse.input as { nodes: unknown[] };

      // Validate each node
      const NodeArraySchema = z.array(
        z.object({
          id: z.string().min(1).max(100),
          title: z.string().min(1).max(200),
          description: z.string().min(1).max(1000),
          phase: z.number().int().min(1).max(10),
          dependencies: z.array(z.string()),
          estimatedHours: z.number().int().min(1).max(500),
          tags: z.array(z.string().max(50)).max(10).default([]),
        })
      );

      const nodesResult = NodeArraySchema.safeParse(rawInput.nodes);
      if (!nodesResult.success) {
        lastError = `Invalid node data: ${nodesResult.error.message}`;
        continue;
      }

      // Semantic validation
      const allIds = new Set(nodesResult.data.map((n) => n.id));
      if (allIds.size !== nodesResult.data.length) {
        lastError = "Duplicate node IDs";
        continue;
      }

      // Reject obviously tiny roadmaps (e.g. 7 nodes) — retry instead of
      // silently serving them as a successful AI-generated roadmap.
      // Project count is intentionally NOT enforced here: unusual careers
      // may legitimately offer fewer project opportunities.
      if (nodesResult.data.length < MIN_ROADMAP_NODES) {
        lastError = `Too few nodes (${nodesResult.data.length}); expected at least ${MIN_ROADMAP_NODES}`;
        continue;
      }

      // Validate dependencies reference existing nodes
      for (const node of nodesResult.data) {
        for (const dep of node.dependencies) {
          if (!allIds.has(dep)) {
            node.dependencies = node.dependencies.filter((d) => d !== dep);
          }
        }
      }

      nodes = nodesResult.data.map((n) => ({
        ...n,
        status: "locked" as const,
      }));
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown AI error";
      if (attempt === 0) continue;
    }
  }

  let servedFromMock = false;
  let mockReason: string | null = null;
  if (!nodes) {
    console.error("[generate] AI failed:", lastError);
    // Graceful fallback to the contract-representative mock — flagged, never
    // silently presented as a successful AI-generated roadmap.
    nodes = mockRoadmap(goal);
    servedFromMock = true;
    mockReason = `AI generation failed after retries (${lastError}); served mock roadmap instead`;
    console.warn(`[generate] ${mockReason}`);
  }

  const now = new Date().toISOString();
  const roadmap = {
    id: generateRoadmapId(),
    goal,
    nodes,
    createdAt: now,
    updatedAt: now,
  };

  const validated = RoadmapSchema.safeParse(roadmap);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Internal validation error" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    roadmap: validated.data,
    ...(servedFromMock && { meta: { source: "mock", reason: mockReason } }),
  });
}
