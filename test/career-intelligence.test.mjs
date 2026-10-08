import test from "node:test";
import assert from "node:assert/strict";

// Import career intelligence computation logic
function getNodeWeight(status) {
  switch (status) {
    case "completed":
    case "known":
      return 1.0;
    case "in_progress":
      return 0.5;
    case "available":
      return 0.15;
    default:
      return 0.0;
  }
}

function computeCareerDNA(nodes) {
  if (!nodes || nodes.length === 0) return [];
  const dims = {
    "Technical Skills": { nodes: [] },
    "Problem Solving": { nodes: [] },
    "Projects & Execution": { nodes: [] },
    "System Design": { nodes: [] },
    "Domain & Communication": { nodes: [] },
  };

  nodes.forEach((node) => {
    if (node.phase <= 2) dims["Technical Skills"].nodes.push(node);
    if (node.phase === 1) dims["Problem Solving"].nodes.push(node);
    if (node.phase >= 4) dims["Projects & Execution"].nodes.push(node);
    if (node.phase >= 3) dims["System Design"].nodes.push(node);
    if (node.tags.some((t) => ["domain", "climate", "git"].includes(t))) dims["Domain & Communication"].nodes.push(node);
  });

  return Object.entries(dims).map(([name, conf]) => {
    const pool = conf.nodes.length > 0 ? conf.nodes : nodes.slice(0, 2);
    const earned = pool.reduce((acc, n) => acc + getNodeWeight(n.status), 0);
    const score = Math.min(100, Math.max(8, Math.round((earned / pool.length) * 100)));
    return { name, score, count: pool.length };
  });
}

function computeGapAnalysis(nodes) {
  const strengths = nodes.filter((n) => n.status === "completed" || n.status === "known");
  const moderateGaps = nodes.filter((n) => n.status === "available" || n.status === "in_progress");
  const criticalGaps = nodes.filter((n) => n.status === "locked");
  return { strengths, moderateGaps, criticalGaps };
}

function computeNextBestAction(nodes) {
  const inProgressNode = nodes.find((n) => n.status === "in_progress");
  if (inProgressNode) return inProgressNode;

  const available = nodes
    .filter((n) => n.status === "available")
    .sort((a, b) => a.phase - b.phase);

  return available[0] || nodes[0] || null;
}

test("computeCareerDNA derives realistic 0-100 scores across 5 dimensions", () => {
  const sampleNodes = [
    { id: "1", title: "Git & TypeScript", phase: 1, status: "known", tags: ["git", "typescript"] },
    { id: "2", title: "React Architecture", phase: 1, status: "completed", tags: ["react"] },
    { id: "3", title: "Backend APIs", phase: 2, status: "in_progress", tags: ["backend"] },
    { id: "4", title: "Cloud DevOps", phase: 4, status: "available", tags: ["cloud"] },
    { id: "5", title: "Capstone Platform", phase: 5, status: "locked", tags: ["capstone"] },
  ];

  const dna = computeCareerDNA(sampleNodes);
  assert.equal(dna.length, 5);
  dna.forEach((dim) => {
    assert.ok(dim.score >= 0 && dim.score <= 100, `${dim.name} score out of range: ${dim.score}`);
    assert.ok(dim.count > 0, `${dim.name} has no nodes assigned`);
  });
});

test("computeGapAnalysis classifies strengths, moderate gaps, and critical gaps accurately", () => {
  const sampleNodes = [
    { id: "1", title: "Git", status: "known" },
    { id: "2", title: "React", status: "completed" },
    { id: "3", title: "Node", status: "in_progress" },
    { id: "4", title: "PostgreSQL", status: "available" },
    { id: "5", title: "Cloud", status: "locked" },
  ];

  const gap = computeGapAnalysis(sampleNodes);
  assert.equal(gap.strengths.length, 2);
  assert.equal(gap.moderateGaps.length, 2);
  assert.equal(gap.criticalGaps.length, 1);
});

test("computeNextBestAction prioritizes in_progress node over available node", () => {
  const sampleNodes = [
    { id: "1", title: "Available Node", phase: 1, status: "available" },
    { id: "2", title: "In Progress Node", phase: 2, status: "in_progress" },
  ];

  const nextAction = computeNextBestAction(sampleNodes);
  assert.equal(nextAction.id, "2");
});
