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

const ROADMAP_TOOL = {
  name: "generate_roadmap",
  description: "Generate a personalized dependency-graph career roadmap",
  input_schema: {
    type: "object" as const,
    properties: {
      nodes: {
        type: "array",
        description: "Ordered list of skill/topic nodes",
        items: {
          type: "object",
          required: ["id", "title", "description", "phase", "dependencies", "estimatedHours", "tags"],
          properties: {
            id: { type: "string", description: "Unique snake_case identifier" },
            title: { type: "string", description: "Short skill/topic name (max 60 chars)" },
            description: { type: "string", description: "2-3 sentence description of what this skill is and why it matters for the goal (max 300 chars)" },
            phase: { type: "number", description: "Learning phase 1-6. Phase 1 = foundation, Phase 6 = advanced/specialization" },
            dependencies: {
              type: "array",
              items: { type: "string" },
              description: "IDs of nodes that must be completed before this one",
            },
            estimatedHours: { type: "number", description: "Estimated study/practice hours" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "2-5 short category tags",
            },
          },
        },
      },
    },
    required: ["nodes"],
  },
};

function mockRoadmap(goal: string): RoadmapNode[] {
  const g = goal.toLowerCase();

  if (g.includes("full stack") || g.includes("developer") || g.includes("software") || g.includes("climate")) {
    return [
      {
        id: "git_typescript",
        title: "Git Version Control & Modern TypeScript",
        description: `Master Git collaboration, branches, and strict static typing with TypeScript for ${goal}.`,
        phase: 1,
        dependencies: [],
        estimatedHours: 30,
        status: "available",
        tags: ["git", "typescript", "tooling"],
      },
      {
        id: "react_frontend",
        title: "Modern React & State Architecture",
        description: `Build reactive component trees, custom hooks, and scalable frontend architecture for ${goal}.`,
        phase: 1,
        dependencies: [],
        estimatedHours: 45,
        status: "available",
        tags: ["react", "frontend", "ui"],
      },
      {
        id: "backend_apis",
        title: "Backend APIs with Node.js & REST/GraphQL",
        description: `Develop high-throughput REST and GraphQL backend services tailored to ${goal}.`,
        phase: 2,
        dependencies: ["git_typescript", "react_frontend"],
        estimatedHours: 50,
        status: "locked",
        tags: ["backend", "nodejs", "api"],
      },
      {
        id: "database_sql",
        title: "PostgreSQL & Time-Series Data Modeling",
        description: `Design relational database schemas, migrations, and telemetry data tables for ${goal}.`,
        phase: 2,
        dependencies: ["backend_apis"],
        estimatedHours: 40,
        status: "locked",
        tags: ["database", "postgresql", "sql"],
      },
      {
        id: "domain_specialization",
        title: g.includes("climate")
          ? "Climate-Tech Protocols & Carbon Accounting APIs"
          : `Core Domain Architecture for ${goal}`,
        description: `Understand regulatory standards, data streams, and domain integration patterns for ${goal}.`,
        phase: 3,
        dependencies: ["database_sql"],
        estimatedHours: 35,
        status: "locked",
        tags: ["domain", "specialization"],
      },
      {
        id: "cloud_devops",
        title: "Cloud Infrastructure, Docker & CI/CD",
        description: `Containerize microservices, configure automated testing, and deploy resilient cloud services.`,
        phase: 4,
        dependencies: ["domain_specialization"],
        estimatedHours: 45,
        status: "locked",
        tags: ["devops", "docker", "cloud"],
      },
      {
        id: "production_capstone",
        title: `Full-Stack Production Platform Capstone`,
        description: `Build and launch a fully featured end-to-end production application demonstrating all competencies for ${goal}.`,
        phase: 5,
        dependencies: ["cloud_devops"],
        estimatedHours: 60,
        status: "locked",
        tags: ["portfolio", "capstone", "production"],
      },
    ];
  }

  return [
    {
      id: "foundations",
      title: "Core Foundations",
      description: `Establish the fundamental knowledge base required for ${goal}.`,
      phase: 1,
      dependencies: [],
      estimatedHours: 40,
      status: "available",
      tags: ["foundation"],
    },
    {
      id: "intermediate",
      title: "Intermediate Practical Skills",
      description: `Build practical intermediate skills that bridge foundations to specialization for ${goal}.`,
      phase: 2,
      dependencies: ["foundations"],
      estimatedHours: 60,
      status: "locked",
      tags: ["intermediate"],
    },
    {
      id: "specialization",
      title: "Core Specialization & Systems",
      description: `Deep-dive into the primary domain competencies needed for ${goal}.`,
      phase: 3,
      dependencies: ["intermediate"],
      estimatedHours: 80,
      status: "locked",
      tags: ["specialization"],
    },
    {
      id: "projects",
      title: "Applied Projects & Portfolio",
      description: `Build real-world projects demonstrating mastery of skills for ${goal}.`,
      phase: 4,
      dependencies: ["specialization"],
      estimatedHours: 120,
      status: "locked",
      tags: ["projects", "portfolio"],
    },
    {
      id: "advanced",
      title: "Advanced Mastery & Leadership",
      description: `Achieve expert-level understanding and cutting-edge competencies for ${goal}.`,
      phase: 5,
      dependencies: ["projects"],
      estimatedHours: 100,
      status: "locked",
      tags: ["advanced"],
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
    const nodes = mockRoadmap(goal);
    const now = new Date().toISOString();
    const roadmap = {
      id: generateRoadmapId(),
      goal,
      nodes,
      createdAt: now,
      updatedAt: now,
    };
    return NextResponse.json({ roadmap });
  }

  const systemPrompt = `You are a world-class career coach and curriculum designer. Your job is to create highly personalized, dependency-based learning roadmaps.

When given a specific career goal, you MUST:
1. Generate 8-18 specific skill/topic nodes tailored EXACTLY to that goal
2. Create realistic dependency chains (most skills build on earlier ones)
3. Organize nodes into 4-6 learning phases
4. Make node descriptions SPECIFIC to the user's goal, not generic
5. Ensure IDs are unique snake_case strings
6. Vary phase durations realistically

CRITICAL: Never create generic "Programming Basics" nodes unless they are genuinely required. Make every node laser-focused on the stated goal.`;

  const userPrompt = `Create a comprehensive, personalized learning roadmap for this SPECIFIC goal: "${goal}"

Requirements:
- 10-16 nodes total
- 4-6 phases (Phase 1 = absolute foundations, Phase 6 = advanced/expert)
- Each node must be DIRECTLY relevant to: "${goal}"
- Dependencies must create a logical learning progression
- EstimatedHours should be realistic (5-200 hours per node)
- Tags should reflect the skill category (e.g., "programming", "math", "tools", "soft-skills")
- Titles must be specific (bad: "Basics", good: "Python for Data Science Fundamentals")
- Descriptions must explain WHY this skill matters for the stated goal`;

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

  if (!nodes) {
    console.error("[generate] AI failed:", lastError);
    // Fallback to mock
    nodes = mockRoadmap(goal);
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

  return NextResponse.json({ roadmap: validated.data });
}
