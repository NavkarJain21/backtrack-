import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  Roadmap,
  NodeStatus,
  NodeDetailResponse,
  AdjustRoadmapResponse,
} from "./schemas";

function computeNodeStatuses(roadmap: Roadmap): Roadmap {
  // Recompute locked/available based on dependencies
  const nodeMap = new Map(roadmap.nodes.map((n) => [n.id, n]));

  const updated = roadmap.nodes.map((node) => {
    // Keep known/completed/in_progress as-is
    if (
      node.status === "known" ||
      node.status === "completed" ||
      node.status === "in_progress"
    ) {
      return node;
    }

    // Check dependencies
    const depsComplete = node.dependencies.every((depId) => {
      const dep = nodeMap.get(depId);
      return (
        dep && (dep.status === "completed" || dep.status === "known")
      );
    });

    const newStatus: NodeStatus =
      node.dependencies.length === 0 || depsComplete ? "available" : "locked";
    return { ...node, status: newStatus };
  });

  return { ...roadmap, nodes: updated, updatedAt: new Date().toISOString() };
}

const initialState = {
  roadmap: null as Roadmap | null,
  selectedNodeId: null as string | null,
  activeTab: "dashboard" as import("./schemas").DashboardTab,
  isGenerating: false,
  isRefining: false,
  isLoadingNodeDetail: false,
  nodeDetailCache: {} as Record<string, NodeDetailResponse>,
  actionItemProgress: {} as Record<string, boolean>,
  lastGoal: "",
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRoadmap: (roadmap) =>
        set({ roadmap: roadmap ? computeNodeStatuses(roadmap) : null }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsGenerating: (v) => set({ isGenerating: v }),
      setIsRefining: (v) => set({ isRefining: v }),
      setIsLoadingNodeDetail: (v) => set({ isLoadingNodeDetail: v }),
      setLastGoal: (goal) => set({ lastGoal: goal }),

      updateNodeStatus: (nodeId, status) => {
        const { roadmap } = get();
        if (!roadmap) return;
        const updated = {
          ...roadmap,
          nodes: roadmap.nodes.map((n) =>
            n.id === nodeId ? { ...n, status } : n
          ),
          updatedAt: new Date().toISOString(),
        };
        set({ roadmap: computeNodeStatuses(updated) });
      },

      updateNodeDetail: (nodeId, detail) => {
        const { roadmap, nodeDetailCache } = get();
        if (!roadmap) return;

        // Merge detail into node
        const updated = {
          ...roadmap,
          nodes: roadmap.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  why: detail.why,
                  actionItems: detail.actionItems,
                  resources: detail.resources,
                  searchQuery: detail.searchQuery,
                }
              : n
          ),
          updatedAt: new Date().toISOString(),
        };
        set({
          roadmap: updated,
          nodeDetailCache: { ...nodeDetailCache, [nodeId]: detail },
        });
      },

      toggleActionItem: (nodeId, itemId) => {
        const key = `${nodeId}-${itemId}`;
        const { actionItemProgress, roadmap } = get();
        const newVal = !actionItemProgress[key];

        // Also update roadmap node action items
        const newProgress = { ...actionItemProgress, [key]: newVal };
        let updatedRoadmap = roadmap;
        if (roadmap) {
          updatedRoadmap = {
            ...roadmap,
            nodes: roadmap.nodes.map((n) => {
              if (n.id !== nodeId || !n.actionItems) return n;
              return {
                ...n,
                actionItems: n.actionItems.map((item) =>
                  item.id === itemId ? { ...item, completed: newVal } : item
                ),
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        }

        set({ actionItemProgress: newProgress, roadmap: updatedRoadmap });
      },

      applyAdjustment: (response) => {
        const { roadmap } = get();
        if (!roadmap) return;

        let nodes = [...roadmap.nodes];

        for (const patch of response.patches) {
          if (patch.action === "mark_known") {
            nodes = nodes.map((n) =>
              n.id === patch.id ? { ...n, status: "known" as NodeStatus } : n
            );
          } else if (patch.action === "remove") {
            nodes = nodes.filter((n) => n.id !== patch.id);
          } else if (patch.action === "add" && patch.node) {
            // Only add if not already present and not the goal node
            if (!nodes.find((n) => n.id === patch.id)) {
              nodes.push(patch.node);
            }
          } else if (patch.action === "update" && patch.node) {
            nodes = nodes.map((n) =>
              n.id === patch.id ? { ...n, ...patch.node } : n
            );
          }
        }

        // Ensure goal node (phase 1 with no dependencies or specially marked) is never removed
        // We protect nodes by ensuring at least one phase-1 node remains
        const hasPhase1 = nodes.some((n) => n.phase === 1);
        if (!hasPhase1 && roadmap.nodes.some((n) => n.phase === 1)) {
          // Restore the first phase-1 node
          const first = roadmap.nodes.find((n) => n.phase === 1);
          if (first) nodes.unshift(first);
        }

        const updatedRoadmap: Roadmap = {
          ...roadmap,
          nodes,
          updatedAt: new Date().toISOString(),
        };
        set({ roadmap: computeNodeStatuses(updatedRoadmap) });
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: "backtrack-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({
        roadmap: state.roadmap,
        activeTab: state.activeTab,
        nodeDetailCache: state.nodeDetailCache,
        actionItemProgress: state.actionItemProgress,
        lastGoal: state.lastGoal,
      }),
    }
  )
);
