"use client";

import { useStore } from "@/lib/store";
import { FolderGit2, CheckCircle2, Clock, ArrowRight, Sparkles, Layers, Award } from "lucide-react";
import { getStatusBg, getStatusColor, getStatusLabel, formatHours, cn } from "@/lib/utils";
import {
  deriveMilestones,
  getChecklistProgress,
  isEvidenceReady,
} from "@/lib/project-evidence";

interface ProjectsViewProps {
  onOpenNode: (nodeId: string) => void;
}

export default function ProjectsView({ onOpenNode }: ProjectsViewProps) {
  const { roadmap, nodeDetailCache, actionItemProgress } = useStore();

  if (!roadmap) return null;

  // Filter project-oriented nodes: phases >= 3, or tagged with project, portfolio, capstone, or applied
  const projectNodes = roadmap.nodes.filter(
    (n) =>
      n.phase >= 3 ||
      n.tags.some((t) => ["project", "portfolio", "capstone", "applied", "production"].includes(t.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="text-emerald-400" size={24} />
            Projects & Capstone Deliverables
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Proof-of-competency portfolio artifacts designed to validate mastery for:{" "}
            <span className="text-slate-200 font-semibold">{roadmap.goal}</span>
          </p>
        </div>

        <div className="text-xs text-slate-400 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="font-bold text-emerald-400">
            {projectNodes.filter((p) => p.status === "completed" || p.status === "known").length}
          </span>{" "}
          / {projectNodes.length} Delivered
        </div>
      </div>

      {/* Projects Grid */}
      {projectNodes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-sm font-semibold text-slate-200">No project or capstone nodes in this roadmap yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Project deliverables will appear here once your roadmap includes applied or portfolio work.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectNodes.map((project, idx) => {
          const cached = nodeDetailCache[project.id];
          const milestones = deriveMilestones(
            project,
            cached?.milestones ?? project.milestones
          ).items;
          const progress = getChecklistProgress(project.id, milestones, actionItemProgress);
          const ready = isEvidenceReady(project.id, milestones, actionItemProgress);
          return (
          <div
            key={project.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Capstone Milestone #{idx + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded border",
                    getStatusColor(project.status)
                  )}
                >
                  {getStatusLabel(project.status)}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-1.5">{project.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Milestone progress (local, from actual checklist state) */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">
                    Milestones {progress.done}/{progress.total}
                  </span>
                  {ready ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-300">
                      <Award size={12} aria-hidden />
                      Evidence Ready
                    </span>
                  ) : (
                    <span className="font-bold text-slate-300">{progress.percentage}%</span>
                  )}
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800"
                  role="progressbar"
                  aria-valuenow={progress.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${project.title} milestones ${progress.done} of ${progress.total} complete`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={13} className="text-amber-400" />
                {formatHours(project.estimatedHours)} allocation
              </span>

              <button
                onClick={() => onOpenNode(project.id)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>View Action Plan</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
