import type { Roadmap, RoadmapNode, NodeStatus } from "./schemas";

export interface CareerDNADimension {
  name: string;
  score: number; // 0 - 100
  totalSkills: number;
  masteredSkills: number;
  level: "Foundational" | "Developing" | "Proficient" | "Advanced" | "Mastery";
  description: string;
  color: string;
}

export interface GapAnalysisData {
  strengths: RoadmapNode[];
  moderateGaps: RoadmapNode[];
  criticalGaps: RoadmapNode[];
  readinessPercentage: number;
  summary: string;
}

export interface NextBestActionData {
  node: RoadmapNode | null;
  reason: string;
  unlockedDownstreamCount: number;
  estimatedHours: number;
}

export interface DashboardMetrics {
  targetRole: string;
  overallProgress: number;
  currentPhase: number;
  totalPhases: number;
  hoursRemaining: number;
  totalHours: number;
  skillsCompleted: number;
  skillsRemaining: number;
  projectsCompleted: number;
  totalProjects: number;
  nextMilestone: string;
}

/** Node mastery weight: completed/known=100%, in_progress=50%, available/locked=0%.
 *  Available nodes carry no mastery credit — showing credit for unstarted work
 *  would manufacture progress on fresh roadmaps. */
function getNodeWeight(status: NodeStatus): number {
  switch (status) {
    case "completed":
    case "known":
      return 1.0;
    case "in_progress":
      return 0.5;
    default:
      return 0.0;
  }
}

/** Determine level label from 0-100 score */
function getLevelLabel(score: number): "Foundational" | "Developing" | "Proficient" | "Advanced" | "Mastery" {
  if (score >= 85) return "Mastery";
  if (score >= 65) return "Advanced";
  if (score >= 45) return "Proficient";
  if (score >= 20) return "Developing";
  return "Foundational";
}

/** Compute Career DNA across 5 core dimensions */
export function computeCareerDNA(nodes: RoadmapNode[]): CareerDNADimension[] {
  if (!nodes || nodes.length === 0) return [];

  // Categorize nodes into dimensions
  const dims: Record<string, { nodes: RoadmapNode[]; color: string; desc: string }> = {
    "Technical Skills": {
      nodes: [],
      color: "from-blue-500 to-cyan-500",
      desc: "Core programming languages, frameworks, database schemas, and developer toolchains.",
    },
    "Problem Solving": {
      nodes: [],
      color: "from-purple-500 to-indigo-500",
      desc: "Algorithm design, data structures, debugging, and systems resilience.",
    },
    "Projects & Execution": {
      nodes: [],
      color: "from-emerald-500 to-teal-500",
      desc: "Hands-on implementation, portfolio artifacts, end-to-end integration, and capstones.",
    },
    "System Design": {
      nodes: [],
      color: "from-amber-500 to-orange-500",
      desc: "Architecture scalability, API contracts, cloud infra, CI/CD pipelines, and microservices.",
    },
    "Domain & Communication": {
      nodes: [],
      color: "from-rose-500 to-pink-500",
      desc: "Industry standards, regulatory compliance, Git team workflows, and domain specialization.",
    },
  };

  nodes.forEach((node) => {
    const text = `${node.title} ${node.description} ${node.tags.join(" ")}`.toLowerCase();

    // Technical
    if (
      node.phase <= 2 ||
      node.tags.some((t) => ["programming", "typescript", "react", "node", "sql", "api", "tools", "foundation"].includes(t)) ||
      text.includes("code") ||
      text.includes("types") ||
      text.includes("frontend")
    ) {
      dims["Technical Skills"].nodes.push(node);
    }

    // Problem Solving
    if (
      node.tags.some((t) => ["algorithm", "data", "problem", "math", "telemetry", "foundation"].includes(t)) ||
      text.includes("data") ||
      text.includes("logic") ||
      text.includes("algorithm") ||
      node.phase === 1
    ) {
      dims["Problem Solving"].nodes.push(node);
    }

    // Projects & Execution
    if (
      node.phase >= 4 ||
      node.tags.some((t) => ["project", "portfolio", "capstone", "applied"].includes(t)) ||
      text.includes("capstone") ||
      text.includes("portfolio") ||
      text.includes("project")
    ) {
      dims["Projects & Execution"].nodes.push(node);
    }

    // System Design
    if (
      node.tags.some((t) => ["backend", "cloud", "devops", "docker", "system", "architecture", "database"].includes(t)) ||
      text.includes("architecture") ||
      text.includes("cloud") ||
      text.includes("backend") ||
      text.includes("database")
    ) {
      dims["System Design"].nodes.push(node);
    }

    // Domain & Communication
    if (
      node.tags.some((t) => ["git", "domain", "specialization", "climate", "security", "workflow"].includes(t)) ||
      text.includes("domain") ||
      text.includes("climate") ||
      text.includes("standards") ||
      text.includes("git")
    ) {
      dims["Domain & Communication"].nodes.push(node);
    }
  });

  return Object.entries(dims).map(([name, conf]) => {
    // Honest empty state: if no roadmap nodes match this dimension, report
    // zero rather than borrowing unrelated nodes (which would invent data).
    if (conf.nodes.length === 0) {
      return {
        name,
        score: 0,
        totalSkills: 0,
        masteredSkills: 0,
        level: getLevelLabel(0),
        description: conf.desc,
        color: conf.color,
      };
    }
    const pool = conf.nodes;
    const totalWeight = pool.length;
    const earnedWeight = pool.reduce((acc, n) => acc + getNodeWeight(n.status), 0);
    const score = Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
    const masteredSkills = pool.filter((n) => n.status === "completed" || n.status === "known").length;

    return {
      name,
      score,
      totalSkills: pool.length,
      masteredSkills,
      level: getLevelLabel(score),
      description: conf.desc,
      color: conf.color,
    };
  });
}

/** Compute Gap Analysis based on actual roadmap node statuses */
export function computeGapAnalysis(nodes: RoadmapNode[]): GapAnalysisData {
  const strengths = nodes.filter((n) => n.status === "completed" || n.status === "known");
  const moderateGaps = nodes.filter((n) => n.status === "available" || n.status === "in_progress");
  const criticalGaps = nodes.filter((n) => n.status === "locked");

  const total = nodes.length;
  const readinessPercentage = total > 0 ? Math.round((strengths.length / total) * 100) : 0;

  let summary = "";
  if (readinessPercentage >= 75) {
    summary = "High Target Match: You have verified core competencies. Final capstone projects remain.";
  } else if (readinessPercentage >= 40) {
    summary = "Solid Foundation: Intermediate dependencies unlocked and ready for execution.";
  } else {
    summary = "Early Acceleration: Foundational dependencies are being established to unlock advanced phases.";
  }

  return {
    strengths,
    moderateGaps,
    criticalGaps,
    readinessPercentage,
    summary,
  };
}

/** Identify Next Best Action based on dependencies and progress */
export function computeNextBestAction(nodes: RoadmapNode[]): NextBestActionData {
  if (!nodes || nodes.length === 0) {
    return { node: null, reason: "No active roadmap nodes found.", unlockedDownstreamCount: 0, estimatedHours: 0 };
  }

  // 1. First priority: currently in_progress node
  const inProgressNode = nodes.find((n) => n.status === "in_progress");
  if (inProgressNode) {
    const downstream = nodes.filter((n) => n.dependencies.includes(inProgressNode.id)).length;
    return {
      node: inProgressNode,
      reason: `Currently active in your learning sprint. Complete this to maintain your velocity.`,
      unlockedDownstreamCount: downstream,
      estimatedHours: inProgressNode.estimatedHours,
    };
  }

  // 2. Second priority: available node with lowest phase and highest downstream impact
  const availableNodes = nodes
    .filter((n) => n.status === "available")
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase - b.phase;
      const downA = nodes.filter((n) => n.dependencies.includes(a.id)).length;
      const downB = nodes.filter((n) => n.dependencies.includes(b.id)).length;
      return downB - downA;
    });

  if (availableNodes.length > 0) {
    const topAvailable = availableNodes[0];
    const downstream = nodes.filter((n) => n.dependencies.includes(topAvailable.id)).length;
    return {
      node: topAvailable,
      reason:
        downstream > 0
          ? `Prerequisites fulfilled. Completing this unlocks ${downstream} downstream competency node${downstream > 1 ? "s" : ""}.`
          : `Immediate high-value skill ready to be tackled in Phase ${topAvailable.phase}.`,
      unlockedDownstreamCount: downstream,
      estimatedHours: topAvailable.estimatedHours,
    };
  }

  // 3. Fallback: first uncompleted node or last capstone node
  const uncompleted = nodes.find((n) => n.status !== "completed" && n.status !== "known");
  if (uncompleted) {
    return {
      node: uncompleted,
      reason: "Next upcoming milestone in your career roadmap progression.",
      unlockedDownstreamCount: 0,
      estimatedHours: uncompleted.estimatedHours,
    };
  }

  return {
    node: nodes[nodes.length - 1],
    reason: "All roadmap milestones achieved! Review your capstone artifacts and portfolio.",
    unlockedDownstreamCount: 0,
    estimatedHours: 0,
  };
}

/** Compute overall Dashboard metrics */
export function computeDashboardMetrics(roadmap: Roadmap | null): DashboardMetrics {
  if (!roadmap || !roadmap.nodes || roadmap.nodes.length === 0) {
    return {
      targetRole: "No Target Role Defined",
      overallProgress: 0,
      currentPhase: 1,
      totalPhases: 5,
      hoursRemaining: 0,
      totalHours: 0,
      skillsCompleted: 0,
      skillsRemaining: 0,
      projectsCompleted: 0,
      totalProjects: 0,
      nextMilestone: "Initialize your career roadmap",
    };
  }

  const nodes = roadmap.nodes;
  const completedNodes = nodes.filter((n) => n.status === "completed" || n.status === "known");
  const overallProgress = Math.round((completedNodes.length / nodes.length) * 100);

  const phases = [...new Set(nodes.map((n) => n.phase))].sort((a, b) => a - b);
  const totalPhases = phases.length > 0 ? Math.max(...phases) : 5;

  // Current phase is the phase of the lowest non-completed node
  const activeNode = nodes.find((n) => n.status === "in_progress" || n.status === "available");
  const currentPhase = activeNode ? activeNode.phase : (nodes.find((n) => n.status === "locked")?.phase ?? totalPhases);

  const totalHours = nodes.reduce((acc, n) => acc + n.estimatedHours, 0);
  const hoursRemaining = nodes
    .filter((n) => n.status !== "completed" && n.status !== "known")
    .reduce((acc, n) => acc + n.estimatedHours, 0);

  const projectNodes = nodes.filter(
    (n) => n.phase >= 4 || n.tags.some((t) => ["project", "portfolio", "capstone"].includes(t.toLowerCase()))
  );
  // Honest count: a roadmap with no project/capstone nodes reports 0/0
  // rather than an invented minimum of 1.
  const totalProjects = projectNodes.length;
  const projectsCompleted = projectNodes.filter((n) => n.status === "completed" || n.status === "known").length;

  const nextActive = nodes.find((n) => n.status === "in_progress" || n.status === "available");
  const nextMilestone = nextActive ? nextActive.title : (nodes[nodes.length - 1]?.title ?? "Complete Roadmap");

  return {
    targetRole: roadmap.goal,
    overallProgress,
    currentPhase,
    totalPhases,
    hoursRemaining,
    totalHours,
    skillsCompleted: completedNodes.length,
    skillsRemaining: nodes.length - completedNodes.length,
    projectsCompleted,
    totalProjects,
    nextMilestone,
  };
}
