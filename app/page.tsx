"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import LandingPage from "@/components/LandingPage";
import RoadmapCanvas from "@/components/RoadmapCanvas";
import RoadmapHeader from "@/components/RoadmapHeader";
import NodeDetailPanel from "@/components/NodeDetailPanel";
import AdjustRoadmapModal from "@/components/AdjustRoadmapModal";

export default function Home() {
  const { roadmap, selectedNodeId, setSelectedNodeId } = useStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  // Avoid hydration mismatch with localStorage persistence
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Loading Backtrack...</span>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return <LandingPage />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 select-none">
      {/* Top Header */}
      <RoadmapHeader onOpenAdjust={() => setIsAdjustOpen(true)} />

      {/* Main Flow Canvas Viewport */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        <RoadmapCanvas
          roadmap={roadmap}
          selectedNodeId={selectedNodeId}
          onNodeClick={(id) => setSelectedNodeId(id)}
        />

        {/* Node Detail Drawer / Panel */}
        {selectedNodeId && (
          <NodeDetailPanel
            nodeId={selectedNodeId}
            onClose={() => setSelectedNodeId(null)}
          />
        )}

        {/* "I Already Know..." Adjustment Modal */}
        <AdjustRoadmapModal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
        />
      </main>
    </div>
  );
}
