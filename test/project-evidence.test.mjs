import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// ── Mirrors of lib/project-evidence.ts pure logic ────────────────────────────
// (Repo convention: test files mirror lib logic; see validation.test.mjs.)

function shortName(title) {
  return title.length > 60 ? `${title.slice(0, 57)}…` : title;
}

function deriveMilestones(node, aiMilestones) {
  if (aiMilestones && aiMilestones.length > 0) {
    return { items: aiMilestones, source: "ai" };
  }
  const name = shortName(node.title);
  const hay = `${node.title} ${node.description} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  const items = [
    { id: "ms-1", text: `Define requirements and scope for "${name}"`, completed: false },
    { id: "ms-2", text: `Design the architecture for "${name}"`, completed: false },
    {
      id: "ms-3",
      text: /api|backend|server/.test(hay)
        ? `Implement core API and data flow for "${name}"`
        : `Implement core functionality for "${name}"`,
      completed: false,
    },
    {
      id: "ms-4",
      text: /ui|frontend|react|app|dashboard/.test(hay)
        ? `Build the user interface for "${name}"`
        : `Wire up integrations for "${name}"`,
      completed: false,
    },
    { id: "ms-5", text: `Add tests covering the core flows of "${name}"`, completed: false },
    { id: "ms-6", text: `Deploy "${name}" and document setup in the README`, completed: false },
  ];
  return { items, source: "inferred" };
}

function isItemDone(nodeId, item, progressMap) {
  const key = `${nodeId}-${item.id}`;
  return progressMap[key] ?? item.completed ?? false;
}

function getChecklistProgress(nodeId, items, progressMap) {
  const total = items.length;
  const done = items.filter((i) => isItemDone(nodeId, i, progressMap)).length;
  return { done, total, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function isEvidenceReady(nodeId, milestones, progressMap) {
  return (
    milestones.length > 0 &&
    getChecklistProgress(nodeId, milestones, progressMap).done === milestones.length
  );
}

function getLockedPrerequisites(node, allNodes) {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  return (node.dependencies ?? []).map((depId) => {
    const dep = byId.get(depId);
    const done = dep?.status === "completed" || dep?.status === "known";
    return { id: depId, title: dep?.title ?? depId, status: dep?.status ?? "missing", done };
  });
}

const README_CHECKLIST_ITEMS = [
  "Problem statement",
  "Features",
  "Tech stack",
  "Architecture",
  "Setup instructions",
  "Screenshots / demo",
  "Results",
  "Future improvements",
];

function derivePortfolioEvidence(node, aiEvidence) {
  if (aiEvidence && aiEvidence.length > 0) return { items: aiEvidence, source: "ai" };
  const hay = `${node.title} ${node.description} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  const name = shortName(node.title);
  const rules = [
    { match: /\bapi\b|\bbackend\b/, category: "Backend APIs" },
    { match: /\breact\b|\bfrontend\b/, category: "Frontend architecture" },
    { match: /\bdeploy|\bdocker\b|\bcloud\b/, category: "Deployment" },
  ];
  const items = rules
    .filter((r) => r.match.test(hay))
    .map((r) => ({ category: r.category, whatItProves: `Demonstrated in "${name}".` }));
  if (items.length === 0) items.push({ category: "Technical skill", whatItProves: `Demonstrated in "${name}".` });
  return { items, source: "inferred" };
}

function deriveRequirementMapping(node, goal, allNodes, aiMapping) {
  if (aiMapping && aiMapping.length > 0) return { items: aiMapping, source: "ai" };
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const name = shortName(node.title);
  const items = [
    { requirement: `Show readiness for: ${goal}`, evidence: `"${name}" targets this role.`, inferred: true },
  ];
  for (const depId of node.dependencies ?? []) {
    const dep = byId.get(depId);
    if (!dep) continue;
    items.push({ requirement: `Apply: ${dep.title}`, evidence: `"${name}" demonstrates ${dep.title}.`, inferred: true });
  }
  return { items, source: "inferred" };
}

// ── Schema mirrors (backwards-compatibility checks) ──────────────────────────

const ActionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(500),
  completed: z.boolean().default(false),
});

const NodeDetailResponseSchema = z.object({
  why: z.string().min(1).max(2000),
  actionItems: z.array(ActionItemSchema).min(1).max(20),
  resources: z.array(z.object({ title: z.string(), url: z.string().url(), type: z.string() })).max(10),
  searchQuery: z.string().min(1).max(200),
  // All project fields optional:
  milestones: z.array(ActionItemSchema).max(12).optional(),
  portfolioDescription: z.string().min(1).max(1500).optional(),
  interviewQuestions: z.array(z.string()).max(12).optional(),
});

const NodeDetailRequestSchema = z.object({
  nodeId: z.string().min(1),
  nodeTitle: z.string().min(1).max(200),
  nodeDescription: z.string().min(1).max(1000),
  goal: z.string().min(1).max(500),
  phase: z.number().int().min(1),
  tags: z.array(z.string()).optional(),
  isProject: z.boolean().optional(),
});

// ── Tests ────────────────────────────────────────────────────────────────────

const projectNode = {
  id: "capstone",
  title: "Full-Stack Production Platform Capstone",
  description: "Build and deploy a backend API with a React UI.",
  phase: 5,
  dependencies: ["backend_apis"],
  estimatedHours: 60,
  status: "available",
  tags: ["portfolio", "capstone", "production"],
};

test("deriveMilestones prefers AI milestones when available", () => {
  const ai = [{ id: "m1", text: "Custom AI milestone", completed: false }];
  const { items, source } = deriveMilestones(projectNode, ai);
  assert.equal(source, "ai");
  assert.deepEqual(items, ai);
});

test("inferred milestones are project-specific, not a hardcoded generic list", () => {
  const a = deriveMilestones(
    { ...projectNode, title: "Climate Data API", description: "Backend API for carbon data", tags: [] },
    undefined
  );
  const b = deriveMilestones(
    { ...projectNode, title: "Portfolio Dashboard UI", description: "React dashboard", tags: [] },
    undefined
  );
  assert.equal(a.source, "inferred");
  // Each checklist references its own project
  assert.ok(a.items.every((m) => m.text.includes("Climate Data API")));
  assert.ok(b.items.every((m) => m.text.includes("Portfolio Dashboard UI")));
  // And they differ by project content (API vs UI wording)
  assert.ok(a.items.some((m) => m.text.includes("API")));
  assert.ok(b.items.some((m) => m.text.includes("user interface")));
  // Stable ids
  assert.deepEqual(a.items.map((m) => m.id), ["ms-1", "ms-2", "ms-3", "ms-4", "ms-5", "ms-6"]);
});

test("getChecklistProgress calculates from the persisted progress map", () => {
  const { items } = deriveMilestones(projectNode, undefined);
  const empty = getChecklistProgress("capstone", items, {});
  assert.equal(empty.done, 0);
  assert.equal(empty.total, 6);
  assert.equal(empty.percentage, 0);

  const partial = getChecklistProgress("capstone", items, {
    "capstone-ms-1": true,
    "capstone-ms-2": true,
    "capstone-ms-3": true,
  });
  assert.equal(partial.done, 3);
  assert.equal(partial.percentage, 50);
});

test("isEvidenceReady requires ALL milestones complete (never auto-completes)", () => {
  const { items } = deriveMilestones(projectNode, undefined);
  // Available node with zero progress is NOT ready
  assert.equal(isEvidenceReady("capstone", items, {}), false);

  const partial = { "capstone-ms-1": true };
  assert.equal(isEvidenceReady("capstone", items, partial), false);

  const full = Object.fromEntries(items.map((m) => [`capstone-${m.id}`, true]));
  assert.equal(isEvidenceReady("capstone", items, full), true);
});

test("getLockedPrerequisites lists actual dependency nodes with done flags", () => {
  const nodes = [
    { id: "backend_apis", title: "Backend APIs", status: "completed" },
    { id: "database_sql", title: "Databases", status: "in_progress" },
    { ...projectNode, dependencies: ["backend_apis", "database_sql"] },
  ];
  const prereqs = getLockedPrerequisites(nodes[2], nodes);
  assert.equal(prereqs.length, 2);
  assert.equal(prereqs[0].title, "Backend APIs");
  assert.equal(prereqs[0].done, true);
  assert.equal(prereqs[1].title, "Databases");
  assert.equal(prereqs[1].done, false);
});

test("progress map keys are namespaced per node (no cross-project leakage)", () => {
  const { items } = deriveMilestones(projectNode, undefined);
  const map = { "capstone-ms-1": true };
  assert.equal(isItemDone("capstone", items[0], map), true);
  assert.equal(isItemDone("other-project", items[0], map), false);
});

test("README checklist covers the 8 standard documentation items", () => {
  assert.equal(README_CHECKLIST_ITEMS.length, 8);
  for (const required of [
    "Problem statement",
    "Features",
    "Tech stack",
    "Architecture",
    "Setup instructions",
    "Screenshots / demo",
    "Results",
    "Future improvements",
  ]) {
    assert.ok(README_CHECKLIST_ITEMS.includes(required), `missing: ${required}`);
  }
});

test("portfolio evidence categories derive from project signals, not one career", () => {
  const backend = derivePortfolioEvidence(
    { ...projectNode, title: "Deploy API", description: "backend api deploy docker", tags: ["backend"] },
    undefined
  );
  const frontend = derivePortfolioEvidence(
    { ...projectNode, title: "React UI", description: "frontend react app", tags: ["frontend"] },
    undefined
  );
  assert.equal(backend.source, "inferred");
  assert.ok(backend.items.some((e) => e.category === "Backend APIs"));
  assert.ok(frontend.items.some((e) => e.category === "Frontend architecture"));
  assert.notDeepEqual(
    backend.items.map((e) => e.category),
    frontend.items.map((e) => e.category)
  );
});

test("derived requirement mappings use real goal/deps and are flagged inferred", () => {
  const nodes = [
    { id: "backend_apis", title: "Backend APIs", status: "completed" },
    { ...projectNode },
  ];
  const { items, source } = deriveRequirementMapping(nodes[1], "Climate Data Engineer", nodes, undefined);
  assert.equal(source, "inferred");
  assert.ok(items[0].requirement.includes("Climate Data Engineer"));
  assert.ok(items.some((m) => m.requirement.includes("Backend APIs")));
  assert.ok(items.every((m) => m.inferred === true));
});

test("legacy cached node details without project fields still validate", () => {
  const legacy = {
    why: "Why text",
    actionItems: [{ id: "a1", text: "Do thing", completed: false }],
    resources: [],
    searchQuery: "query",
  };
  const parsed = NodeDetailResponseSchema.safeParse(legacy);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.milestones, undefined);
});

test("node-detail request stays valid with and without isProject flag", () => {
  const base = {
    nodeId: "n1",
    nodeTitle: "Skill",
    nodeDescription: "Desc",
    goal: "Some Goal",
    phase: 1,
  };
  assert.equal(NodeDetailRequestSchema.safeParse(base).success, true);
  assert.equal(NodeDetailRequestSchema.safeParse({ ...base, isProject: true }).success, true);
});

test("existing node-detail behavior: actionItems remain required (min 1)", () => {
  const missing = {
    why: "Why",
    actionItems: [],
    resources: [],
    searchQuery: "q",
  };
  assert.equal(NodeDetailResponseSchema.safeParse(missing).success, false);
});
