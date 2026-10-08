import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

// Test schemas logic
const NodeStatusSchema = z.enum(["locked", "available", "in_progress", "completed", "known"]);

const ALLOWED_LINK_HOSTS = [
  "youtube.com",
  "youtu.be",
  "github.com",
  "docs.google.com",
  "coursera.org",
  "udemy.com",
  "edx.org",
  "medium.com",
  "dev.to",
  "stackoverflow.com",
  "developer.mozilla.org",
  "roadmap.sh",
  "freecodecamp.org",
  "w3schools.com",
  "npmjs.com",
  "pypi.org",
  "docs.python.org",
  "reactjs.org",
  "react.dev",
  "nextjs.org",
  "vercel.com",
  "typescriptlang.org",
  "typescript-lang.org",
];

function isAllowedHost(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_LINK_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

function getSafeResourceUrl(urlStr, title) {
  if (isAllowedHost(urlStr)) {
    return urlStr;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(title + " tutorial guide")}`;
}

function computeProgress(nodes) {
  const completed = nodes.filter((n) => n.status === "completed").length;
  const known = nodes.filter((n) => n.status === "known").length;
  const total = nodes.length;
  const percentage = total > 0 ? Math.round(((completed + known) / total) * 100) : 0;
  return { completed, known, total, percentage };
}

function computeNodeStatuses(roadmap) {
  const nodeMap = new Map(roadmap.nodes.map((n) => [n.id, n]));

  const updated = roadmap.nodes.map((node) => {
    if (
      node.status === "known" ||
      node.status === "completed" ||
      node.status === "in_progress"
    ) {
      return node;
    }

    const depsComplete = node.dependencies.every((depId) => {
      const dep = nodeMap.get(depId);
      return dep && (dep.status === "completed" || dep.status === "known");
    });

    const newStatus =
      node.dependencies.length === 0 || depsComplete ? "available" : "locked";
    return { ...node, status: newStatus };
  });

  return { ...roadmap, nodes: updated };
}

test("NodeStatusSchema validates valid and invalid statuses", () => {
  assert.equal(NodeStatusSchema.parse("available"), "available");
  assert.equal(NodeStatusSchema.parse("known"), "known");
  assert.equal(NodeStatusSchema.parse("completed"), "completed");
  assert.equal(NodeStatusSchema.parse("in_progress"), "in_progress");
  assert.equal(NodeStatusSchema.parse("locked"), "locked");

  assert.throws(() => NodeStatusSchema.parse("invalid_status"));
});

test("isAllowedHost validates trusted education and docs domains", () => {
  assert.equal(isAllowedHost("https://github.com/facebook/react"), true);
  assert.equal(isAllowedHost("https://www.youtube.com/watch?v=123"), true);
  assert.equal(isAllowedHost("https://developer.mozilla.org/en-US/"), true);
  assert.equal(isAllowedHost("https://react.dev/learn"), true);
  assert.equal(isAllowedHost("https://docs.python.org/3/"), true);

  // Untrusted or malicious domains should return false
  assert.equal(isAllowedHost("https://phishing-site.xyz/download"), false);
  assert.equal(isAllowedHost("https://attacker.com"), false);
  assert.equal(isAllowedHost("not-a-valid-url"), false);
});

test("getSafeResourceUrl sanitizes untrusted domains to safe Google queries", () => {
  const safe = getSafeResourceUrl("https://github.com/facebook/react", "React Repo");
  assert.equal(safe, "https://github.com/facebook/react");

  const fallback = getSafeResourceUrl("https://sketchy-site.io/free", "Distributed Systems");
  assert.ok(fallback.startsWith("https://www.google.com/search?q="));
  assert.ok(fallback.includes("Distributed%20Systems"));
});

test("computeProgress calculates accurate completion and known percentage", () => {
  const nodes = [
    { id: "1", status: "completed" },
    { id: "2", status: "known" },
    { id: "3", status: "available" },
    { id: "4", status: "locked" },
  ];
  const { completed, known, total, percentage } = computeProgress(nodes);
  assert.equal(completed, 1);
  assert.equal(known, 1);
  assert.equal(total, 4);
  assert.equal(percentage, 50);
});

test("computeNodeStatuses unlocks nodes when dependencies are completed or known", () => {
  const roadmap = {
    id: "r1",
    goal: "Test Engineer",
    nodes: [
      { id: "n1", title: "A", phase: 1, dependencies: [], status: "locked" },
      { id: "n2", title: "B", phase: 2, dependencies: ["n1"], status: "locked" },
      { id: "n3", title: "C", phase: 3, dependencies: ["n2"], status: "locked" },
    ],
  };

  // Initially: n1 has 0 dependencies -> becomes available. n2 and n3 stay locked.
  const r1 = computeNodeStatuses(roadmap);
  assert.equal(r1.nodes[0].status, "available");
  assert.equal(r1.nodes[1].status, "locked");
  assert.equal(r1.nodes[2].status, "locked");

  // User marks n1 as "known"
  r1.nodes[0].status = "known";
  const r2 = computeNodeStatuses(r1);
  assert.equal(r2.nodes[0].status, "known");
  assert.equal(r2.nodes[1].status, "available"); // Unlocked!
  assert.equal(r2.nodes[2].status, "locked");

  // User marks n2 as "completed"
  r2.nodes[1].status = "completed";
  const r3 = computeNodeStatuses(r2);
  assert.equal(r3.nodes[0].status, "known");
  assert.equal(r3.nodes[1].status, "completed");
  assert.equal(r3.nodes[2].status, "available"); // Unlocked!
});
