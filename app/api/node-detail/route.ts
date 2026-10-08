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
      // ── Project-only fields (omit entirely for non-project skill nodes) ──
      difficulty: {
        type: "string",
        description: "Project difficulty: one of Beginner, Intermediate, Advanced, Capstone",
      },
      estimatedEffort: {
        type: "string",
        description: "Short effort label, e.g. '40-60h over 3-4 weeks'",
      },
      expectedOutcome: {
        type: "string",
        description: "One concrete sentence describing the finished, demonstrable artifact",
      },
      techStack: {
        type: "array",
        description: "Suggested technologies for building this project (short names)",
        items: { type: "string" },
      },
      skillsDemonstrated: {
        type: "array",
        description: "Skills this project proves (short labels)",
        items: { type: "string" },
      },
      milestones: {
        type: "array",
        description: "5-7 project-specific build milestones in execution order (NOT generic learning tasks)",
        items: {
          type: "object",
          required: ["id", "text", "completed"],
          properties: {
            id: { type: "string" },
            text: { type: "string", description: "Concrete build milestone specific to this project" },
            completed: { type: "boolean" },
          },
        },
      },
      doneWhen: {
        type: "array",
        description: "4-6 concrete, verifiable completion criteria for this project",
        items: { type: "string" },
      },
      githubGuidance: {
        type: "object",
        required: ["repoSetup", "repoStructure", "readmeRequirements", "commitGuidance", "suggestedIssues"],
        description: "Repository guidance. NEVER include repository URLs — only setup/structure/process advice.",
        properties: {
          repoSetup: { type: "string" },
          repoStructure: { type: "array", items: { type: "string" } },
          readmeRequirements: { type: "array", items: { type: "string" } },
          commitGuidance: { type: "string" },
          suggestedIssues: { type: "array", items: { type: "string" } },
        },
      },
      readmeChecklist: {
        type: "array",
        description: "Documentation checklist items for this project's README",
        items: {
          type: "object",
          required: ["id", "text", "completed"],
          properties: {
            id: { type: "string" },
            text: { type: "string" },
            completed: { type: "boolean" },
          },
        },
      },
      portfolioDescription: {
        type: "string",
        description: "Concise portfolio-ready paragraph: what was built, why it matters, tech used, outcome demonstrated. No invented metrics.",
      },
      interviewQuestions: {
        type: "array",
        description: "5-7 interview questions specific to THIS project's architecture, tradeoffs, testing and deployment",
        items: { type: "string" },
      },
      portfolioEvidence: {
        type: "array",
        description: "What this project proves for the target role (categories + explanation)",
        items: {
          type: "object",
          required: ["category", "whatItProves"],
          properties: {
            category: { type: "string" },
            whatItProves: { type: "string" },
          },
        },
      },
      requirementMapping: {
        type: "array",
        description: "Target-role requirement → project evidence mappings",
        items: {
          type: "object",
          required: ["requirement", "evidence"],
          properties: {
            requirement: { type: "string" },
            evidence: { type: "string" },
          },
        },
      },
    },
  },
};

function mockNodeDetail(nodeTitle: string, goal: string, isProject = false): NodeDetailResponse {
  const base: NodeDetailResponse = {
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

  if (!isProject) return base;

  // Project mock: template-based, project-specific, no fake URLs or metrics.
  return {
    ...base,
    why: `“${nodeTitle}” is the portfolio proof for ${goal}: it turns practiced skills into a deployed, demonstrable artifact that hiring reviewers can inspect, run, and question you about.`,
    difficulty: "Intermediate",
    estimatedEffort: "40-60h over 3-4 weeks",
    expectedOutcome: `A deployed, documented "${nodeTitle}" with tests and a README a reviewer can run.`,
    techStack: ["Git", "REST APIs", "Testing"],
    skillsDemonstrated: ["Problem solving", "System design", "Deployment"],
    milestones: [
      { id: "ms-1", text: `Define requirements and scope for "${nodeTitle}"`, completed: false },
      { id: "ms-2", text: `Design the architecture for "${nodeTitle}"`, completed: false },
      { id: "ms-3", text: `Implement core functionality for "${nodeTitle}"`, completed: false },
      { id: "ms-4", text: `Add tests covering the core flows of "${nodeTitle}"`, completed: false },
      { id: "ms-5", text: `Deploy "${nodeTitle}" and document setup in the README`, completed: false },
    ],
    doneWhen: [
      `Core functionality of "${nodeTitle}" works end to end`,
      "Tests pass for the critical paths",
      "Project is deployed and reachable",
      "README is complete with setup instructions",
      "A demo or walkthrough is available",
    ],
    githubGuidance: {
      repoSetup: "Create a new repository with a README, a .gitignore for your stack, and branch protection on main. Keep secrets in environment variables.",
      repoStructure: ["README.md", "src/", "tests/", ".github/workflows/"],
      readmeRequirements: ["Problem statement", "Features", "Setup instructions", "Demo"],
      commitGuidance: "Commit in small reviewable units; one pull request per milestone, merged only when CI is green.",
      suggestedIssues: ["Define requirements and scope", "Design architecture", "Implement core functionality", "Add tests", "Deploy and document"],
    },
    readmeChecklist: [
      { id: "readme-1", text: "Problem statement", completed: false },
      { id: "readme-2", text: "Features", completed: false },
      { id: "readme-3", text: "Tech stack", completed: false },
      { id: "readme-4", text: "Architecture", completed: false },
      { id: "readme-5", text: "Setup instructions", completed: false },
      { id: "readme-6", text: "Screenshots / demo", completed: false },
      { id: "readme-7", text: "Results", completed: false },
      { id: "readme-8", text: "Future improvements", completed: false },
    ],
    portfolioDescription: `Built "${nodeTitle}" as portfolio work toward ${goal}: a deployed, tested artifact demonstrating end-to-end delivery.`,
    interviewQuestions: [
      `Walk me through the architecture of "${nodeTitle}". Why did you structure it that way?`,
      `What was the hardest technical challenge in "${nodeTitle}" and how did you solve it?`,
      `What tradeoffs did you make in "${nodeTitle}"? What would you change?`,
      `How did you test "${nodeTitle}"?`,
      `How is "${nodeTitle}" deployed?`,
      `If you had two more weeks on "${nodeTitle}", what would you improve?`,
    ],
    portfolioEvidence: [
      { category: "Technical skill", whatItProves: `End-to-end delivery, demonstrated in "${nodeTitle}".` },
      { category: "Deployment", whatItProves: `Taking software to production, demonstrated in "${nodeTitle}".` },
    ],
    requirementMapping: [
      {
        requirement: `Show readiness for: ${goal}`,
        evidence: `"${nodeTitle}" is portfolio work aimed directly at this target role.`,
        inferred: true,
      },
    ],
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

  const { nodeId, nodeTitle, nodeDescription, goal, phase, tags, isProject } = parsed.data;
  const safeGoal = sanitizeInput(goal);
  const safeTitle = sanitizeInput(nodeTitle);

  if (DISABLE_AI) {
    return NextResponse.json(mockNodeDetail(safeTitle, safeGoal, isProject === true));
  }

  const systemPrompt = isProject
    ? `You are an expert engineering mentor and portfolio coach. Generate highly personalized, project-specific build guidance.
Every recommendation must be DIRECTLY relevant to the user's stated goal and to THIS project. Never give generic advice.
For resource URLs, use real, well-known URLs (e.g., docs.python.org, reactjs.org, youtube.com search URLs, github.com).
NEVER invent repository URLs. GitHub guidance must be setup/structure/process advice only.
NEVER invent metrics (no user counts, percentages, or performance numbers).`
    : `You are an expert learning coach. Generate highly personalized, specific, actionable learning guidance.
Every recommendation must be DIRECTLY relevant to the user's stated goal. Never give generic advice.
For resource URLs, use real, well-known URLs (e.g., docs.python.org, reactjs.org, youtube.com search URLs, github.com).`;

  const userPrompt = isProject
    ? `Generate a detailed project workspace for building: "${safeTitle}"

Context:
- This is Phase ${phase} of their roadmap
- Their goal: "${safeGoal}"
- Project description: "${sanitizeInput(nodeDescription)}"
- Tags: ${tags?.join(", ") ?? "none"}

Provide:
1. Why THIS project matters as portfolio evidence for "${safeGoal}" (2-3 sentences, be specific)
2. 5-8 specific, actionable learning tasks
3. 4-6 real learning resources with actual URLs
4. An optimized Google/YouTube search query for this project
5. Project brief: difficulty (Beginner/Intermediate/Advanced/Capstone), estimated effort, one-sentence expected outcome, tech stack, skills demonstrated
6. 5-7 build milestones in execution order, specific to THIS project (not generic learning steps)
7. 4-6 concrete, verifiable "done when" criteria for THIS project
8. GitHub guidance: repo setup advice, recommended structure, README requirements, commit guidance, suggested issues (NO repository URLs)
9. README documentation checklist
10. A concise portfolio-ready description (what was built, why it matters, tech used, outcome — no invented metrics)
11. 5-7 interview questions specific to THIS project's architecture, tradeoffs, testing and deployment
12. Portfolio evidence: what this project proves for the target role (categories + explanations)
13. Target-role requirement → project evidence mappings`
    : `Generate a detailed action pack for learning: "${safeTitle}"

Context:
- This is Phase ${phase} of their roadmap
- Their goal: "${safeGoal}"
- Node description: "${sanitizeInput(nodeDescription)}"
- Tags: ${tags?.join(", ") ?? "none"}

Provide:
1. Why this specific skill is critical for "${safeGoal}" (2-3 sentences, be specific)
2. 6-8 actionable learning tasks (specific, measurable, not vague)
3. 4-6 real learning resources with actual URLs
4. An optimized Google/YouTube search query for this topic

Omit all project-only fields for this skill node.`;

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

      // Add IDs to action items if missing (same for milestone checklists)
      const withIds = <T extends { id?: string }>(list: T[] | undefined, prefix: string): T[] | undefined =>
        list?.map((item, i) => ({ ...item, id: item.id || `${nodeId}_${prefix}_${i}` }) as T);
      const detailWithIds: NodeDetailResponse = {
        ...validated.data,
        actionItems: withIds(validated.data.actionItems, "action") ?? validated.data.actionItems,
        ...(validated.data.milestones !== undefined && {
          milestones: withIds(validated.data.milestones, "ms"),
        }),
        ...(validated.data.readmeChecklist !== undefined && {
          readmeChecklist: withIds(validated.data.readmeChecklist, "readme"),
        }),
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
