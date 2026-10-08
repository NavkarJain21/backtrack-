import type {
  GithubGuidance,
  PortfolioEvidenceItem,
  ProjectMilestone,
  RequirementMapping,
  RoadmapNode,
} from "./schemas";
import { getNodeKinds, type RoadmapNodeKind } from "./roadmap-graph";

/**
 * project-evidence — pure derivations that turn a PROJECT node + roadmap
 * context into portfolio evidence. Every value comes from actual node /
 * roadmap state. Anything not supplied by AI is explicitly labeled inferred
 * and built from the project's own title, description, tags, dependencies
 * and estimates — never hardcoded to a career.
 */

export type ItemSource = "ai" | "inferred";

export interface DerivedList<T> {
  items: T[];
  source: ItemSource;
}

export function getNodeKind(
  node: RoadmapNode,
  allNodes: RoadmapNode[]
): RoadmapNodeKind {
  return getNodeKinds(allNodes).get(node.id) ?? "skill";
}

export function isProjectNode(
  node: RoadmapNode,
  allNodes: RoadmapNode[]
): boolean {
  const kind = getNodeKind(node, allNodes);
  return kind === "project" || kind === "goal";
}

// ── Tech stack: only terms actually present in the node's own text/tags ──────

const TECH_KEYWORDS: { match: RegExp; label: string }[] = [
  { match: /\breact\b/, label: "React" },
  { match: /\bnext\.?js\b/, label: "Next.js" },
  { match: /\btypescript\b|\bts\b/, label: "TypeScript" },
  { match: /\bjavascript\b|\bjs\b/, label: "JavaScript" },
  { match: /\bnode\.?js\b|\bexpress\b/, label: "Node.js" },
  { match: /\bpython\b|\bdjango\b|\bflask\b|\bfastapi\b/, label: "Python" },
  { match: /\bsql\b|\bpostgres/, label: "PostgreSQL / SQL" },
  { match: /\bmongo/, label: "MongoDB" },
  { match: /\bgraphql\b/, label: "GraphQL" },
  { match: /\brest\b|\bapi\b/, label: "REST APIs" },
  { match: /\bdocker\b|\bcontainer/, label: "Docker" },
  { match: /\bkubernetes\b|\bk8s\b/, label: "Kubernetes" },
  { match: /\bci\/?cd\b|\bgithub actions\b|\bpipeline/, label: "CI/CD" },
  { match: /\baws\b|\bazure\b|\bgcp\b|\bcloud\b/, label: "Cloud" },
  { match: /\bgit\b/, label: "Git" },
  { match: /\btailwind\b|\bcss\b/, label: "CSS / Tailwind" },
  { match: /\bmachine learning\b|\bml\b|\btensorflow\b|\bpytorch\b/, label: "Machine Learning" },
  { match: /\btesting\b|\bjest\b|\bpytest\b|\bcypress\b|\bvitest\b/, label: "Testing" },
  { match: /\bauth\b|\boauth\b|\bjwt\b/, label: "Auth" },
  { match: /\bwebsocket\b|\brealtime\b|\breal-time\b/, label: "Realtime" },
];

export function scanTechTerms(node: RoadmapNode): string[] {
  const hay = `${node.title} ${node.description} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  const found: string[] = [];
  for (const { match, label } of TECH_KEYWORDS) {
    if (match.test(hay) && !found.includes(label)) found.push(label);
  }
  return found;
}

export function deriveTechStack(
  node: RoadmapNode,
  aiStack?: string[]
): DerivedList<string> {
  if (aiStack && aiStack.length > 0) {
    return { items: [...new Set(aiStack)], source: "ai" };
  }
  const scanned = scanTechTerms(node);
  const fromTags = (node.tags ?? []).filter(
    (t) => !scanned.some((s) => s.toLowerCase() === t.toLowerCase())
  );
  return { items: [...scanned, ...fromTags].slice(0, 10), source: "inferred" };
}

// ── Skills demonstrated: tags + actual prerequisite node titles ───────────────

export function deriveSkillsDemonstrated(
  node: RoadmapNode,
  allNodes: RoadmapNode[],
  aiSkills?: string[]
): DerivedList<string> {
  if (aiSkills && aiSkills.length > 0) {
    return { items: [...new Set(aiSkills)], source: "ai" };
  }
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const fromDeps = (node.dependencies ?? [])
    .map((id) => byId.get(id)?.title)
    .filter((t): t is string => !!t);
  const items = [...new Set([...(node.tags ?? []), ...fromDeps])].slice(0, 12);
  return { items, source: "inferred" };
}

// ── Difficulty: from the node's own estimate (labeled inferred) ──────────────

export function deriveDifficulty(
  node: RoadmapNode,
  aiDifficulty?: string
): { label: string; source: ItemSource } {
  if (aiDifficulty) return { label: aiDifficulty, source: "ai" };
  const h = node.estimatedHours ?? 0;
  const label =
    h <= 20 ? "Beginner" : h <= 50 ? "Intermediate" : h <= 100 ? "Advanced" : "Capstone";
  return { label, source: "inferred" };
}

export function deriveEffort(
  node: RoadmapNode,
  aiEffort?: string
): { label: string; source: ItemSource } {
  if (aiEffort) return { label: aiEffort, source: "ai" };
  return { label: `${node.estimatedHours ?? 0}h estimated`, source: "inferred" };
}

// ── Milestones: AI first, else project-specific inferred checklist ────────────

function shortName(title: string): string {
  return title.length > 60 ? `${title.slice(0, 57)}…` : title;
}

export function deriveMilestones(
  node: RoadmapNode,
  aiMilestones?: ProjectMilestone[]
): DerivedList<ProjectMilestone> {
  if (aiMilestones && aiMilestones.length > 0) {
    return { items: aiMilestones, source: "ai" };
  }
  const name = shortName(node.title);
  const has = (re: RegExp) =>
    re.test(`${node.title} ${node.description} ${(node.tags ?? []).join(" ")}`.toLowerCase());
  const items: ProjectMilestone[] = [
    { id: "ms-1", text: `Define requirements and scope for "${name}"`, completed: false },
    { id: "ms-2", text: `Design the architecture for "${name}"`, completed: false },
    {
      id: "ms-3",
      text: has(/api|backend|server/)
        ? `Implement core API and data flow for "${name}"`
        : `Implement core functionality for "${name}"`,
      completed: false,
    },
    {
      id: "ms-4",
      text: has(/ui|frontend|react|app|dashboard/)
        ? `Build the user interface for "${name}"`
        : `Wire up integrations for "${name}"`,
      completed: false,
    },
    { id: "ms-5", text: `Add tests covering the core flows of "${name}"`, completed: false },
    { id: "ms-6", text: `Deploy "${name}" and document setup in the README`, completed: false },
  ];
  return { items, source: "inferred" };
}

// ── Done-when criteria ────────────────────────────────────────────────────────

export function deriveDoneWhen(
  node: RoadmapNode,
  aiDoneWhen?: string[]
): DerivedList<string> {
  if (aiDoneWhen && aiDoneWhen.length > 0) {
    return { items: aiDoneWhen, source: "ai" };
  }
  const name = shortName(node.title);
  return {
    items: [
      `Core functionality of "${name}" works end to end`,
      "Tests pass for the critical paths",
      "Project is deployed and reachable",
      "README is complete with setup instructions",
      "A demo or walkthrough is available",
    ],
    source: "inferred",
  };
}

// ── GitHub guidance (suggestions only — never fake repo URLs) ────────────────

export function slugSuggestion(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "my-project"
  );
}

export function deriveGithubGuidance(
  node: RoadmapNode,
  aiGuidance?: GithubGuidance
): DerivedList<GithubGuidance> {
  if (aiGuidance) return { items: [aiGuidance], source: "ai" };
  const slug = slugSuggestion(node.title);
  const name = shortName(node.title);
  const guidance: GithubGuidance = {
    repoSetup: `Create a new repository named "${slug}". Initialize with a README, a .gitignore for your stack, and branch protection on main. Keep secrets in environment variables — never commit them.`,
    repoStructure: [
      "README.md — problem, features, setup, demo",
      "src/ — application source code",
      "tests/ — automated tests",
      ".github/workflows/ — CI checks",
    ],
    readmeRequirements: [...README_CHECKLIST_ITEMS],
    commitGuidance:
      "Commit in small reviewable units with imperative messages (e.g. “Add auth middleware”). Open one pull request per milestone and merge only when CI is green.",
    suggestedIssues: deriveMilestones(node).items.map((m) => m.text.replace(/^Define |^Design |^Implement |^Build |^Add |^Deploy /i, (v) => v).replace(`"${name}"`, name)),
  };
  return { items: [guidance], source: "inferred" };
}

// ── README checklist (generic documentation items, tracked locally) ──────────

export const README_CHECKLIST_ITEMS: string[] = [
  "Problem statement",
  "Features",
  "Tech stack",
  "Architecture",
  "Setup instructions",
  "Screenshots / demo",
  "Results",
  "Future improvements",
];

export function deriveReadmeChecklist(
  aiChecklist?: ProjectMilestone[]
): DerivedList<ProjectMilestone> {
  if (aiChecklist && aiChecklist.length > 0) {
    return { items: aiChecklist, source: "ai" };
  }
  return {
    items: README_CHECKLIST_ITEMS.map((text, i) => ({
      id: `readme-${i + 1}`,
      text,
      completed: false,
    })),
    source: "inferred",
  };
}

// ── Portfolio description (no invented metrics) ───────────────────────────────

export function derivePortfolioDescription(
  node: RoadmapNode,
  goal: string,
  techStack: string[],
  expectedOutcome?: string,
  aiDescription?: string
): { text: string; source: ItemSource } {
  if (aiDescription) return { text: aiDescription, source: "ai" };
  const tech = techStack.length > 0 ? ` using ${techStack.slice(0, 4).join(", ")}` : "";
  const outcome = expectedOutcome ?? node.description;
  return {
    text: `Built "${node.title}"${tech} as portfolio work toward ${goal}. ${outcome}`,
    source: "inferred",
  };
}

// ── Portfolio evidence: categories selected from actual project signals ───────

const EVIDENCE_RULES: { match: RegExp; category: string; proves: (name: string) => string }[] = [
  { match: /\bapi\b|\bbackend\b|\bserver\b|\bnode\b/, category: "Backend APIs", proves: (n) => `Designing and shipping server-side logic, demonstrated in "${n}".` },
  { match: /\breact\b|\bfrontend\b|\bui\b|\bnext\b/, category: "Frontend architecture", proves: (n) => `Building structured user interfaces, demonstrated in "${n}".` },
  { match: /\bsql\b|\bdatabase\b|\bpostgres|\bmongo|\bdata\b/, category: "Data modeling", proves: (n) => `Modeling and persisting domain data, demonstrated in "${n}".` },
  { match: /\bdeploy|\bci\/?cd\b|\bdocker\b|\bcloud\b|\bproduction\b/, category: "Deployment", proves: (n) => `Taking software to production with repeatable delivery, demonstrated in "${n}".` },
  { match: /\btest\b/, category: "Testing", proves: (n) => `Verifying behavior with automated tests, demonstrated in "${n}".` },
  { match: /\bauth\b|\bsecurity\b/, category: "Security practices", proves: (n) => `Handling identity and access responsibly, demonstrated in "${n}".` },
  { match: /\bdesign\b|\barchitect/, category: "System design", proves: (n) => `Making and documenting architecture decisions, demonstrated in "${n}".` },
  { match: /\bcollaborat|\bteam\b|\bpr\b|\bpull request\b|\bgit\b/, category: "Collaboration", proves: (n) => `Working in a reviewable, version-controlled workflow, demonstrated in "${n}".` },
  { match: /\bproblem\b|\balgorithm|\boptimiz|\bperformance\b/, category: "Problem solving", proves: (n) => `Breaking down and solving non-trivial problems, demonstrated in "${n}".` },
  { match: /\bclimate\b|\bfinance\b|\bhealth\b|\beducation\b|\bdomain\b/, category: "Domain knowledge", proves: (n) => `Applying domain constraints to real software, demonstrated in "${n}".` },
];

export function derivePortfolioEvidence(
  node: RoadmapNode,
  aiEvidence?: PortfolioEvidenceItem[]
): DerivedList<PortfolioEvidenceItem> {
  if (aiEvidence && aiEvidence.length > 0) {
    return { items: aiEvidence, source: "ai" };
  }
  const hay = `${node.title} ${node.description} ${(node.tags ?? []).join(" ")}`.toLowerCase();
  const name = shortName(node.title);
  const items = EVIDENCE_RULES.filter((r) => r.match.test(hay)).map((r) => ({
    category: r.category,
    whatItProves: r.proves(name),
  }));
  if (items.length === 0) {
    items.push({
      category: "Technical skill",
      whatItProves: `Applying ${node.tags.length > 0 ? node.tags.slice(0, 3).join(", ") : "core technical skills"} end to end, demonstrated in "${name}".`,
    });
  }
  return { items: items.slice(0, 6), source: "inferred" };
}

// ── Requirement mapping: goal + real prerequisite titles, labeled ────────────

export function deriveRequirementMapping(
  node: RoadmapNode,
  goal: string,
  allNodes: RoadmapNode[],
  aiMapping?: RequirementMapping[]
): DerivedList<RequirementMapping> {
  if (aiMapping && aiMapping.length > 0) {
    return { items: aiMapping, source: "ai" };
  }
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const name = shortName(node.title);
  const items: RequirementMapping[] = [
    {
      requirement: `Show readiness for: ${goal}`,
      evidence: `"${name}" is portfolio work aimed directly at this target role.`,
      inferred: true,
    },
  ];
  for (const depId of node.dependencies ?? []) {
    const dep = byId.get(depId);
    if (!dep) continue;
    items.push({
      requirement: `Apply: ${dep.title}`,
      evidence: `"${name}" builds on and demonstrates ${dep.title}.`,
      inferred: true,
    });
    if (items.length >= 5) break;
  }
  return { items, source: "inferred" };
}

// ── Interview questions: project-specific, from actual title/tech ────────────

export function deriveInterviewQuestions(
  node: RoadmapNode,
  techStack: string[],
  aiQuestions?: string[]
): DerivedList<string> {
  if (aiQuestions && aiQuestions.length > 0) {
    return { items: aiQuestions, source: "ai" };
  }
  const name = shortName(node.title);
  const tech = techStack.length > 0 ? techStack.slice(0, 3).join(", ") : "your chosen stack";
  return {
    items: [
      `Walk me through the architecture of "${name}". Why did you structure it that way?`,
      `What was the hardest technical challenge in "${name}" and how did you solve it?`,
      `What tradeoffs did you make when building "${name}" with ${tech}? What would you change?`,
      `How did you test "${name}"? Which parts are covered and which are not?`,
      `How is "${name}" deployed? Describe the path from commit to production.`,
      `If you had two more weeks on "${name}", what would you improve and why?`,
    ],
    source: "inferred",
  };
}

// ── Progress (from the persisted actionItemProgress map + item flags) ────────

export function isItemDone(
  nodeId: string,
  item: { id: string; completed?: boolean },
  progressMap: Record<string, boolean>
): boolean {
  const key = `${nodeId}-${item.id}`;
  return progressMap[key] ?? item.completed ?? false;
}

export function getChecklistProgress(
  nodeId: string,
  items: { id: string; completed?: boolean }[],
  progressMap: Record<string, boolean>
): { done: number; total: number; percentage: number } {
  const total = items.length;
  const done = items.filter((i) => isItemDone(nodeId, i, progressMap)).length;
  return { done, total, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function isEvidenceReady(
  nodeId: string,
  milestones: { id: string; completed?: boolean }[],
  progressMap: Record<string, boolean>
): boolean {
  return (
    milestones.length > 0 &&
    getChecklistProgress(nodeId, milestones, progressMap).done === milestones.length
  );
}

// ── Locked prerequisites: actual dependency nodes ────────────────────────────

export interface PrereqInfo {
  id: string;
  title: string;
  status: string;
  done: boolean;
}

export function getLockedPrerequisites(
  node: RoadmapNode,
  allNodes: RoadmapNode[]
): PrereqInfo[] {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  return (node.dependencies ?? []).map((depId) => {
    const dep = byId.get(depId);
    const done = dep?.status === "completed" || dep?.status === "known";
    return {
      id: depId,
      title: dep?.title ?? depId,
      status: dep?.status ?? "missing",
      done,
    };
  });
}
