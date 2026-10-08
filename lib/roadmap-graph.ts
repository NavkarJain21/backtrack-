import type { RoadmapNode } from "./schemas";

/**
 * roadmap-graph — pure, testable derivations over Zustand roadmap state.
 *
 * Every value displayed by the Roadmap Workspace (header, lanes, timeline,
 * critical path, you-are-here, search/filter) MUST come from these helpers
 * applied to the actual `roadmap.nodes` array. Nothing is hardcoded.
 *
 * The AI roadmap schema has no explicit node-type field, so node kind
 * (skill / project / role / credential / goal) is *inferred* from the
 * node's own tags + title + graph position — never invented.
 */

export type RoadmapNodeKind =
  | "skill"
  | "project"
  | "role"
  | "credential"
  | "goal";

export type NodeFilter = "all" | RoadmapNodeKind;

export interface PhaseSummary {
  phase: number;
  /** e.g. "Phase 2" — AI provides phase numbers only, never names. */
  name: string;
  /** Derived subtitle from the phase's own tags, e.g. "backend · sql". */
  subtitle: string;
  total: number;
  completed: number;
  percentage: number;
  hoursTotal: number;
  hoursRemaining: number;
}

export interface RoadmapProgress {
  completed: number;
  known: number;
  total: number;
  percentage: number;
  hoursTotal: number;
  hoursDone: number;
  hoursRemaining: number;
}

export interface TimelineStep {
  id: string | null;
  title: string;
  detail: string;
}

export interface RoadmapTimeline {
  current: TimelineStep;
  nextMilestone: TimelineStep;
  nextPhase: TimelineStep;
  finalTarget: TimelineStep;
}

// ── Node kind inference ──────────────────────────────────────────────────────

const CREDENTIAL_TAGS = new Set([
  "cert",
  "certs",
  "certification",
  "certifications",
  "credential",
  "credentials",
  "exam",
  "license",
  "certificate",
]);

const PROJECT_TAGS = new Set([
  "project",
  "projects",
  "portfolio",
  "capstone",
  "applied",
  "build",
]);

const ROLE_TAGS = new Set([
  "role",
  "interview",
  "career",
  "job",
  "leadership",
  "soft-skills",
]);

function haystack(node: RoadmapNode): string {
  return `${node.title} ${node.description}`.toLowerCase();
}

function hasTag(node: RoadmapNode, set: Set<string>): boolean {
  return node.tags.some((t) => set.has(t.toLowerCase()));
}

/**
 * Infer a node's kind from its own data + graph position.
 * `isTerminal` = no other node depends on it. `maxPhase` = highest phase number.
 */
export function inferNodeKind(
  node: RoadmapNode,
  opts: { isTerminal: boolean; maxPhase: number }
): RoadmapNodeKind {
  const text = haystack(node);

  // Credentials are explicit: cert / exam / license language wins.
  if (
    hasTag(node, CREDENTIAL_TAGS) ||
    text.includes("certification") ||
    text.includes("certified") ||
    text.includes("credential") ||
    text.includes("licens")
  ) {
    return "credential";
  }

  // Final-target node (terminal in the highest phase) is the goal.
  // This mirrors the "final goal" the dependency graph converges on.
  if (
    opts.isTerminal &&
    node.phase === opts.maxPhase &&
    (hasTag(node, PROJECT_TAGS) ||
      text.includes("capstone") ||
      text.includes("production") ||
      text.includes("mastery") ||
      text.includes("final") ||
      text.includes("portfolio") ||
      text.includes("project"))
  ) {
    return "goal";
  }
  // A lone terminal node in the max phase with no other signal is still
  // the roadmap's final target — treat it as the goal, not a plain skill.
  if (opts.isTerminal && node.phase === opts.maxPhase) {
    return "goal";
  }

  if (
    hasTag(node, PROJECT_TAGS) ||
    text.includes("capstone") ||
    text.includes("portfolio") ||
    text.includes("build a ") ||
    text.includes("build and") ||
    text.includes(" end-to-end")
  ) {
    return "project";
  }

  if (
    hasTag(node, ROLE_TAGS) ||
    text.includes("interview") ||
    text.includes("job-ready") ||
    text.includes("job ready")
  ) {
    return "role";
  }

  return "skill";
}

/** Build a kind lookup for every node in the roadmap. */
export function getNodeKinds(nodes: RoadmapNode[]): Map<string, RoadmapNodeKind> {
  const dependents = new Set<string>();
  for (const n of nodes) {
    for (const dep of n.dependencies) dependents.add(dep);
  }
  const maxPhase = nodes.reduce((m, n) => Math.max(m, n.phase), 1);
  const kinds = new Map<string, RoadmapNodeKind>();
  for (const n of nodes) {
    kinds.set(
      n.id,
      inferNodeKind(n, { isTerminal: !dependents.has(n.id), maxPhase })
    );
  }
  return kinds;
}

// ── Progress / phases ────────────────────────────────────────────────────────

function isDone(status: string): boolean {
  return status === "completed" || status === "known";
}

export function getRoadmapProgress(nodes: RoadmapNode[]): RoadmapProgress {
  const completed = nodes.filter((n) => n.status === "completed").length;
  const known = nodes.filter((n) => n.status === "known").length;
  const total = nodes.length;
  const hoursTotal = nodes.reduce((a, n) => a + (n.estimatedHours || 0), 0);
  const hoursDone = nodes
    .filter((n) => isDone(n.status))
    .reduce((a, n) => a + (n.estimatedHours || 0), 0);
  return {
    completed,
    known,
    total,
    percentage: total > 0 ? Math.round(((completed + known) / total) * 100) : 0,
    hoursTotal,
    hoursDone,
    hoursRemaining: Math.max(0, hoursTotal - hoursDone),
  };
}

export function getPhaseSummaries(nodes: RoadmapNode[]): PhaseSummary[] {
  const phases = [...new Set(nodes.map((n) => n.phase))].sort((a, b) => a - b);
  return phases.map((phase) => {
    const inPhase = nodes.filter((n) => n.phase === phase);
    const completed = inPhase.filter((n) => isDone(n.status)).length;
    const hoursTotal = inPhase.reduce((a, n) => a + (n.estimatedHours || 0), 0);
    const hoursRemaining = inPhase
      .filter((n) => !isDone(n.status))
      .reduce((a, n) => a + (n.estimatedHours || 0), 0);

    // Subtitle from the phase's own most common tags (derived, not invented).
    const tagCounts = new Map<string, number>();
    for (const n of inPhase) {
      for (const t of n.tags || []) {
        const key = t.toLowerCase();
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
    const subtitle =
      topTags.length > 0
        ? topTags.join(" · ")
        : `${inPhase.length} ${inPhase.length === 1 ? "node" : "nodes"}`;

    return {
      phase,
      name: `Phase ${phase}`,
      subtitle,
      total: inPhase.length,
      completed,
      percentage:
        inPhase.length > 0 ? Math.round((completed / inPhase.length) * 100) : 0,
      hoursTotal,
      hoursRemaining,
    };
  });
}

/** Current phase = phase of the lowest-phase incomplete node (actual state). */
export function getCurrentPhase(nodes: RoadmapNode[]): number {
  if (!nodes.length) return 1;
  const incomplete = nodes.filter((n) => !isDone(n.status));
  if (incomplete.length === 0) {
    return Math.max(...nodes.map((n) => n.phase));
  }
  return Math.min(...incomplete.map((n) => n.phase));
}

// ── You-are-here ─────────────────────────────────────────────────────────────

/**
 * Current position: in-progress node first (lowest phase), else the available
 * node with the lowest phase + highest downstream impact, else the first
 * incomplete node. Returns null only when everything is done.
 */
export function getYouAreHereId(nodes: RoadmapNode[]): string | null {
  if (!nodes.length) return null;

  const inProgress = nodes
    .filter((n) => n.status === "in_progress")
    .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  if (inProgress.length > 0) return inProgress[0].id;

  const downstream = new Map<string, number>();
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      downstream.set(dep, (downstream.get(dep) ?? 0) + 1);
    }
  }
  const available = nodes
    .filter((n) => n.status === "available")
    .sort(
      (a, b) =>
        a.phase - b.phase ||
        (downstream.get(b.id) ?? 0) - (downstream.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id)
    );
  if (available.length > 0) return available[0].id;

  const incomplete = nodes
    .filter((n) => !isDone(n.status))
    .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  return incomplete.length > 0 ? incomplete[0].id : null;
}

// ── Critical path ────────────────────────────────────────────────────────────

/**
 * Critical dependency path: the longest-hours chain through the real
 * dependency graph ending at a terminal node. Uses only actual
 * `dependencies` + `estimatedHours` — never fabricated edges.
 */
export function computeCriticalPath(nodes: RoadmapNode[]): {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
} {
  const empty = { nodeIds: new Set<string>(), edgeIds: new Set<string>() };
  if (!nodes.length) return empty;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dependents = new Map<string, string[]>();
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (!byId.has(dep)) continue; // ignore dangling deps (already sanitized upstream)
      const list = dependents.get(dep) ?? [];
      list.push(n.id);
      dependents.set(dep, list);
    }
  }

  // Deterministic topological-ish order: phase, then id.
  const ordered = [...nodes].sort(
    (a, b) => a.phase - b.phase || a.id.localeCompare(b.id)
  );

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const n of ordered) {
    dist.set(n.id, n.estimatedHours || 0);
    prev.set(n.id, null);
  }

  for (const n of ordered) {
    const base = dist.get(n.id) ?? 0;
    const outs = (dependents.get(n.id) ?? []).slice().sort();
    for (const outId of outs) {
      const out = byId.get(outId);
      if (!out) continue;
      const candidate = base + (out.estimatedHours || 0);
      if (candidate > (dist.get(outId) ?? 0)) {
        dist.set(outId, candidate);
        prev.set(outId, n.id);
      }
    }
  }

  // Best terminal (no dependents) by accumulated hours.
  const terminals = nodes.filter((n) => !(dependents.get(n.id) ?? []).length);
  const pool = terminals.length > 0 ? terminals : nodes;
  let end: RoadmapNode | null = null;
  let best = -1;
  for (const t of pool) {
    const d = dist.get(t.id) ?? 0;
    if (d > best) {
      best = d;
      end = t;
    }
  }
  if (!end) return empty;

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  let cur: string | null = end.id;
  nodeIds.add(end.id);
  while (cur) {
    const p = prev.get(cur);
    if (!p) break;
    edgeIds.add(`${p}->${cur}`);
    nodeIds.add(p);
    cur = p;
  }
  return { nodeIds, edgeIds };
}

// ── Timeline ─────────────────────────────────────────────────────────────────

/** Compact Current → Next milestone → Next phase → Final target, all from state. */
export function getRoadmapTimeline(nodes: RoadmapNode[]): RoadmapTimeline {
  const none: TimelineStep = { id: null, title: "—", detail: "" };
  if (!nodes.length) {
    return { current: none, nextMilestone: none, nextPhase: none, finalTarget: none };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hereId = getYouAreHereId(nodes);
  const here = hereId ? byId.get(hereId) ?? null : null;

  const incomplete = nodes
    .filter((n) => !isDone(n.status))
    .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));

  const { nodeIds: critical } = computeCriticalPath(nodes);
  const criticalOrdered = nodes
    .filter((n) => critical.has(n.id))
    .sort((a, b) => a.phase - b.phase || a.id.localeCompare(b.id));
  const finalTarget =
    criticalOrdered.length > 0
      ? criticalOrdered[criticalOrdered.length - 1]
      : nodes[nodes.length - 1];

  const step = (n: RoadmapNode | null, fallback: string): TimelineStep =>
    n
      ? {
          id: n.id,
          title: n.title,
          detail: `Phase ${n.phase} · ${n.estimatedHours}h`,
        }
      : { id: null, title: fallback, detail: "" };

  if (!here) {
    // Everything complete — timeline collapses onto the final target.
    const done: TimelineStep = {
      id: finalTarget.id,
      title: finalTarget.title,
      detail: `Phase ${finalTarget.phase} · Complete`,
    };
    return {
      current: { id: null, title: "Roadmap complete", detail: "All nodes verified" },
      nextMilestone: done,
      nextPhase: done,
      finalTarget: done,
    };
  }

  const afterHere = incomplete.filter((n) => n.id !== here.id);
  const nextMilestone = afterHere[0] ?? null;
  const nextPhaseNode =
    afterHere.find((n) => n.phase > here.phase) ?? null;

  return {
    current: step(here, "Current position"),
    nextMilestone: step(nextMilestone, "No further milestones"),
    nextPhase: step(
      nextPhaseNode,
      nextPhaseNode === null && afterHere.length === 0
        ? "Final phase reached"
        : "No later phase"
    ),
    finalTarget: step(finalTarget, "Final target"),
  };
}

// ── Search / filter (client-side, never mutates the graph) ───────────────────

export function matchesSearch(node: RoadmapNode, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (node.title.toLowerCase().includes(q)) return true;
  if (node.description.toLowerCase().includes(q)) return true;
  if ((node.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
  // Phase queries: "phase 2", "phase2", "2"
  const phaseQ = q.replace(/^phase\s*/, "");
  if (phaseQ === String(node.phase)) return true;
  if (q === `phase ${node.phase}`) return true;
  return false;
}

export function matchesFilter(
  kind: RoadmapNodeKind,
  filter: NodeFilter
): boolean {
  return filter === "all" || kind === filter;
}

/** Hours → compact remaining-time label (hours only; no invented dates). */
export function formatRemaining(hours: number): string {
  if (hours <= 0) return "0h";
  if (hours < 60) return `${hours}h`;
  const days = Math.floor(hours / 8);
  return `${hours}h (~${days}d)`;
}
