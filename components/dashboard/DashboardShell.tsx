"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHome from "./DashboardHome";
import SkillsView from "./SkillsView";
import ProjectsView from "./ProjectsView";
import ProgressView from "./ProgressView";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";
import RoadmapCanvas from "@/components/RoadmapCanvas";
import RoadmapHeader from "@/components/RoadmapHeader";
import NodeDetailPanel from "@/components/NodeDetailPanel";
import AdjustRoadmapModal from "@/components/AdjustRoadmapModal";
import { Menu, Compass, Sparkles, GitFork } from "lucide-react";

export default function DashboardShell() {
  const {
    roadmap,
    activeTab,
    setActiveTab,
    selectedNodeId,
    setSelectedNodeId,
  } = useStore();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  if (!roadmap) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Sidebar Navigation */}
      <DashboardSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAdjust={() => setIsAdjustOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden p-3.5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
              <Compass size={16} />
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[180px]">
              {roadmap.goal}
            </span>
          </div>

          <button
            onClick={() => setIsAdjustOpen(true)}
            className="p-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 text-xs font-semibold"
          >
            <Sparkles size={14} />
          </button>
        </div>

        {/* View Switcher Container */}
        <main className="flex-1 overflow-hidden relative">
          {activeTab === "dashboard" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <DashboardHome
                onOpenNode={(id) => setSelectedNodeId(id)}
                onOpenAdjust={() => setIsAdjustOpen(true)}
                onContinueRoadmap={() => setActiveTab("roadmap")}
              />
            </div>
          )}

          {activeTab === "roadmap" && (
            <div className="flex flex-col h-full w-full relative">
              <RoadmapHeader onOpenAdjust={() => setIsAdjustOpen(true)} />
              <div className="flex-1 relative w-full h-full overflow-hidden">
                <RoadmapCanvas
                  roadmap={roadmap}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={(id) => setSelectedNodeId(id)}
                />
              </div>
            </div>
          )}

          {activeTab === "skills" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <SkillsView onOpenNode={(id) => setSelectedNodeId(id)} />
            </div>
          )}

          {activeTab === "projects" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <ProjectsView onOpenNode={(id) => setSelectedNodeId(id)} />
            </div>
          )}

          {activeTab === "progress" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <ProgressView />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <ProfileView />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              <SettingsView />
            </div>
          )}
        </main>
      </div>

      {/* Global Slide-over Node Detail Panel */}
      {selectedNodeId && (
        <NodeDetailPanel
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Global "I Already Know..." Adjustment Modal */}
      <AdjustRoadmapModal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
      />
    </div>
  );
}
