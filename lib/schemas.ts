import { z } from "zod";

// ── Node status ──────────────────────────────────────────────────────────────
export const NodeStatusSchema = z.enum([
  "locked",
  "available",
  "in_progress",
  "completed",
  "known",
]);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

// ── Resource link ────────────────────────────────────────────────────────────
export const ALLOWED_LINK_HOSTS = [
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
  "mdn",
  "developer.mozilla.org",
  "roadmap.sh",
  "freecodecamp.org",
  "w3schools.com",
  "npmjs.com",
  "pypi.org",
  "docs.python.org",
  "reactjs.org",
  "nextjs.org",
  "vercel.com",
  "typescript-lang.org",
  "typescriptlang.org",
];

export const ResourceLinkSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  type: z.enum(["video", "article", "docs", "course", "tool", "repo"]),
});
export type ResourceLink = z.infer<typeof ResourceLinkSchema>;

// ── Action item ──────────────────────────────────────────────────────────────
export const ActionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(500),
  completed: z.boolean().default(false),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

// ── Project evidence schemas (all optional → backwards compatible) ──────────

export const ProjectMilestoneSchema = ActionItemSchema;
export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;

export const GithubGuidanceSchema = z.object({
  repoSetup: z.string().min(1).max(1000),
  repoStructure: z.array(z.string().min(1).max(200)).max(15),
  readmeRequirements: z.array(z.string().min(1).max(200)).max(15),
  commitGuidance: z.string().min(1).max(1000),
  suggestedIssues: z.array(z.string().min(1).max(300)).max(15),
});
export type GithubGuidance = z.infer<typeof GithubGuidanceSchema>;

export const PortfolioEvidenceItemSchema = z.object({
  category: z.string().min(1).max(60),
  whatItProves: z.string().min(1).max(500),
});
export type PortfolioEvidenceItem = z.infer<typeof PortfolioEvidenceItemSchema>;

export const RequirementMappingSchema = z.object({
  requirement: z.string().min(1).max(300),
  evidence: z.string().min(1).max(500),
  inferred: z.boolean().default(false),
});
export type RequirementMapping = z.infer<typeof RequirementMappingSchema>;

// Shared optional project fields (node + detail response stay in sync)
const ProjectFields = {
  difficulty: z.string().min(1).max(100).optional(),
  estimatedEffort: z.string().min(1).max(100).optional(),
  expectedOutcome: z.string().min(1).max(1000).optional(),
  techStack: z.array(z.string().min(1).max(80)).max(15).optional(),
  skillsDemonstrated: z.array(z.string().min(1).max(80)).max(15).optional(),
  milestones: z.array(ProjectMilestoneSchema).max(12).optional(),
  doneWhen: z.array(z.string().min(1).max(300)).max(10).optional(),
  githubGuidance: GithubGuidanceSchema.optional(),
  readmeChecklist: z.array(ProjectMilestoneSchema).max(12).optional(),
  portfolioDescription: z.string().min(1).max(1500).optional(),
  interviewQuestions: z.array(z.string().min(1).max(500)).max(12).optional(),
  portfolioEvidence: z.array(PortfolioEvidenceItemSchema).max(8).optional(),
  requirementMapping: z.array(RequirementMappingSchema).max(8).optional(),
};

// ── Roadmap node ─────────────────────────────────────────────────────────────
export const RoadmapNodeSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  phase: z.number().int().min(1).max(10),
  dependencies: z.array(z.string()),
  estimatedHours: z.number().int().min(1).max(500),
  status: NodeStatusSchema.default("locked"),
  tags: z.array(z.string().max(50)).max(10).default([]),
  // Populated lazily by AI node detail call
  why: z.string().max(2000).optional(),
  actionItems: z.array(ActionItemSchema).optional(),
  resources: z.array(ResourceLinkSchema).optional(),
  searchQuery: z.string().max(200).optional(),
  ...ProjectFields,
});
export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;

// ── Roadmap ──────────────────────────────────────────────────────────────────
export const RoadmapSchema = z.object({
  id: z.string().min(1),
  goal: z.string().min(1).max(500),
  nodes: z.array(RoadmapNodeSchema).min(1).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;

// ── API request/response schemas ──────────────────────────────────────────────

export const GenerateRoadmapRequestSchema = z.object({
  goal: z.string().min(5).max(500).trim(),
});
export type GenerateRoadmapRequest = z.infer<typeof GenerateRoadmapRequestSchema>;

export const GenerateRoadmapResponseSchema = z.object({
  roadmap: RoadmapSchema,
});
export type GenerateRoadmapResponse = z.infer<typeof GenerateRoadmapResponseSchema>;

// ── Node detail schemas ───────────────────────────────────────────────────────

export const NodeDetailRequestSchema = z.object({
  nodeId: z.string().min(1),
  nodeTitle: z.string().min(1).max(200),
  nodeDescription: z.string().min(1).max(1000),
  goal: z.string().min(1).max(500),
  phase: z.number().int().min(1),
  tags: z.array(z.string()).optional(),
  isProject: z.boolean().optional(),
});
export type NodeDetailRequest = z.infer<typeof NodeDetailRequestSchema>;

export const NodeDetailResponseSchema = z.object({
  why: z.string().min(1).max(2000),
  actionItems: z.array(ActionItemSchema).min(1).max(20),
  resources: z.array(ResourceLinkSchema).max(10),
  searchQuery: z.string().min(1).max(200),
  ...ProjectFields,
});
export type NodeDetailResponse = z.infer<typeof NodeDetailResponseSchema>;

// ── "I already know..." adjustment ────────────────────────────────────────────

export const AdjustRoadmapRequestSchema = z.object({
  statement: z.string().min(1).max(500).trim(),
  currentRoadmap: RoadmapSchema,
});
export type AdjustRoadmapRequest = z.infer<typeof AdjustRoadmapRequestSchema>;

export const NodePatchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["mark_known", "remove", "add", "update"]),
  node: RoadmapNodeSchema.optional(),
});
export type NodePatch = z.infer<typeof NodePatchSchema>;

export const AdjustRoadmapResponseSchema = z.object({
  matchedNodeIds: z.array(z.string()),
  patches: z.array(NodePatchSchema),
  summary: z.string().max(1000),
});
export type AdjustRoadmapResponse = z.infer<typeof AdjustRoadmapResponseSchema>;

export const DashboardTabSchema = z.enum([
  "dashboard",
  "roadmap",
  "skills",
  "projects",
  "progress",
  "profile",
  "settings",
]);
export type DashboardTab = z.infer<typeof DashboardTabSchema>;

export interface AppState {
  roadmap: Roadmap | null;
  selectedNodeId: string | null;
  activeTab: DashboardTab;
  isGenerating: boolean;
  isRefining: boolean;
  isLoadingNodeDetail: boolean;
  nodeDetailCache: Record<string, NodeDetailResponse>;
  actionItemProgress: Record<string, boolean>; // nodeId-itemId -> completed
  lastGoal: string;

  // Actions
  setRoadmap: (roadmap: Roadmap | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setActiveTab: (tab: DashboardTab) => void;
  setIsGenerating: (v: boolean) => void;
  setIsRefining: (v: boolean) => void;
  setIsLoadingNodeDetail: (v: boolean) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  updateNodeDetail: (nodeId: string, detail: NodeDetailResponse) => void;
  toggleActionItem: (nodeId: string, itemId: string) => void;
  toggleDetailItem: (nodeId: string, itemId: string) => void;
  applyAdjustment: (response: AdjustRoadmapResponse) => void;
  setLastGoal: (goal: string) => void;
  reset: () => void;
}
