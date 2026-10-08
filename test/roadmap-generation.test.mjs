import test from "node:test";
import assert from "node:assert/strict";

// Mirrors of generation-pipeline constants/logic from app/api/generate/route.ts.
// Repo convention: test files mirror lib logic (see validation.test.mjs).
const MIN_ROADMAP_NODES = 12;

function isProjectLikeTag(tag) {
  return ["project", "portfolio", "capstone", "projects", "applied", "build"].includes(
    tag.toLowerCase()
  );
}

function validateRoadmapSemantics(nodes) {
  const allIds = new Set(nodes.map((n) => n.id));
  if (allIds.size !== nodes.length) return { ok: false, error: "Duplicate node IDs" };
  if (nodes.length < MIN_ROADMAP_NODES)
    return { ok: false, error: `Too few nodes (${nodes.length}); expected at least ${MIN_ROADMAP_NODES}` };
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!allIds.has(dep)) return { ok: false, error: `Dangling dependency ${dep}` };
    }
  }
  return { ok: true };
}

// Guard against prompt/route drift: assert the ACTUAL route file carries the
// contract. (Repo mirror-tests alone would pass even if the route regressed.)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../app/api/generate/route.ts", import.meta.url)),
  "utf8"
);

function contractNodes(source) {
  // Extract the mockRoadmap return array literal region for shape checks.
  const start = source.indexOf("function mockRoadmap");
  const returnAt = source.indexOf("return [", start);
  return source.slice(returnAt, source.indexOf("export async function POST"));
}

test("mock roadmap in the route meets the real product contract", () => {
  const mock = contractNodes(routeSource);
  // At least 12 nodes
  const idMatches = [...mock.matchAll(/id: "/g)];
  assert.ok(idMatches.length >= 12, `mock has ${idMatches.length} nodes (< 12)`);
  // At least 2 project-ish tagged nodes
  const projectTags = [...mock.matchAll(/tags: \[[^\]]*"(?:project|portfolio|capstone)"/g)];
  assert.ok(projectTags.length >= 2, `mock has ${projectTags.length} project-tagged nodes (< 2)`);
  // A role/interview node and a credential node exist
  assert.match(mock, /"interview"/, "mock missing a role/interview node");
  assert.match(mock, /"certification"/, "mock missing a credential node");
  // Final terminal goal: a phase-5 node depending on the projects
  assert.match(mock, /capstone_goal,?\n?/);
  assert.match(routeSource, /dependencies: \["portfolio_project", "advanced_systems"\]/);
});

test("route enforces the minimum node count and documents the project target", () => {
  assert.match(routeSource, /MIN_ROADMAP_NODES = 12/);
  assert.match(routeSource, /nodesResult\.data\.length < MIN_ROADMAP_NODES/);
  assert.match(routeSource, /16-24 nodes total/);
  assert.match(routeSource, /MIN_ROADMAP_NODES\}\`/, "floor named in prompts/errors");
});

test("no contradictory node-count instructions remain in the prompts", () => {
  assert.equal(routeSource.includes("8-18"), false, "old 8-18 instruction still present");
  assert.equal(routeSource.includes("10-16 nodes total"), false, "old 10-16 instruction still present");
  assert.match(routeSource, /16-24/);
});

test("mock mode result is flagged, never silently AI-shaped", () => {
  assert.match(routeSource, /meta: \{ source: "mock"/);
  assert.match(routeSource, /servedFromMock/);
  assert.match(routeSource, /DISABLE_AI is enabled/);
});

test("missing API key also takes the flagged mock path", () => {
  assert.match(routeSource, /ANTHROPIC_API_KEY is not configured/);
});

test("MIN_ROADMAP_NODES is a reasonable floor consistent with the 16-24 target", () => {
  assert.equal(MIN_ROADMAP_NODES, 12); // rejects 7-node output, does not demand the full 16
  assert.ok(MIN_ROADMAP_NODES > 7);
  assert.ok(MIN_ROADMAP_NODES <= 16);
});

test("semantic validation rejects an obviously tiny roadmap (7 nodes)", () => {
  const tiny = Array.from({ length: 7 }, (_, i) => ({
    id: `n${i}`,
    phase: (i % 5) + 1,
    dependencies: i === 0 ? [] : [`n${i - 1}`],
  }));
  const result = validateRoadmapSemantics(tiny);
  assert.equal(result.ok, false);
  assert.match(result.error, /Too few nodes \(7\)/);
});

test("semantic validation accepts a roadmap at the minimum size", () => {
  const nodes = Array.from({ length: MIN_ROADMAP_NODES }, (_, i) => ({
    id: `n${i}`,
    phase: (i % 5) + 1,
    dependencies: i === 0 ? [] : [`n${i - 1}`],
  }));
  assert.equal(validateRoadmapSemantics(nodes).ok, true);
});

test("existing validation behavior is preserved (duplicates and dangling deps)", () => {
  const dup = [
    { id: "a", dependencies: [] },
    { id: "a", dependencies: [] },
  ];
  assert.equal(validateRoadmapSemantics(dup).ok, false);
  assert.match(validateRoadmapSemantics(dup).error, /Duplicate/);

  const dangling = [
    { id: "a", dependencies: ["ghost"] },
    ...Array.from({ length: 11 }, (_, i) => ({ id: `b${i}`, dependencies: [] })),
  ];
  assert.equal(validateRoadmapSemantics(dangling).ok, false);
  assert.match(validateRoadmapSemantics(dangling).error, /Dangling/);
});

test("project tags are the ones kind inference keys on", () => {
  // lib/roadmap-graph.ts PROJECT_TAGS must match what the mock/AI emits,
  // otherwise project filtering keeps coming back empty.
  for (const tag of ["project", "portfolio", "capstone"]) {
    assert.ok(isProjectLikeTag(tag));
  }
  assert.ok(!isProjectLikeTag("react"));
});
