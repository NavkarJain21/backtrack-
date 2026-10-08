"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { computeGapAnalysis } from "@/lib/career-intelligence";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GapAnalysisCardProps {
  onSelectNode: (nodeId: string) => void;
}

export default function GapAnalysisCard({ onSelectNode }: GapAnalysisCardProps) {
  const { roadmap } = useStore();
  const [activeCategory, setActiveCategory] = useState<"all" | "strengths" | "moderate" | "critical">("all");

  const gapData = useMemo(() => {
    return computeGapAnalysis(roadmap?.nodes || []);
  }, [roadmap?.nodes]);

  const { strengths, moderateGaps, criticalGaps, readinessPercentage, summary } = gapData;
  const totalNodes = (roadmap?.nodes || []).length;

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-800/60 text-purple-400">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Target Gap Analysis
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                  Competency Map
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Verified candidate capabilities vs target role requirements
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">{readinessPercentage}%</span>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Role Match
            </div>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Readiness Trajectory</span>
            <span className="text-slate-400 font-mono">
              {strengths.length} / {(roadmap?.nodes || []).length} Verified
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(strengths.length / ((roadmap?.nodes.length || 1))) * 100}%` }}
              title="Strengths"
            />
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(moderateGaps.length / ((roadmap?.nodes.length || 1))) * 100}%` }}
              title="Moderate Gaps"
            />
            <div
              className="h-full bg-slate-700 transition-all duration-500"
              style={{ width: `${(criticalGaps.length / ((roadmap?.nodes.length || 1))) * 100}%` }}
              title="Critical Gaps"
            />
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {strengths.length} Strengths
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {moderateGaps.length} Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              {criticalGaps.length} Critical
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 mb-3.5 border-b border-slate-800/80 pb-2.5">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
              activeCategory === "all"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            All Skills
          </button>
          <button
            onClick={() => setActiveCategory("strengths")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              activeCategory === "strengths"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <CheckCircle2 size={12} />
            Strengths ({strengths.length})
          </button>
          <button
            onClick={() => setActiveCategory("moderate")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              activeCategory === "moderate"
                ? "bg-amber-950 text-amber-300 border border-amber-800"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <AlertTriangle size={12} />
            Moderate ({moderateGaps.length})
          </button>
          <button
            onClick={() => setActiveCategory("critical")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              activeCategory === "critical"
                ? "bg-slate-800 text-slate-300 border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Lock size={12} />
            Critical ({criticalGaps.length})
          </button>
        </div>

        {/* Skills List */}
        {totalNodes === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            No roadmap data yet. Generate a roadmap to populate your gap analysis.
          </div>
        ) : (
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {/* Strengths */}
          {(activeCategory === "all" || activeCategory === "strengths") &&
            strengths.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-800/40 hover:border-emerald-700/60 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300">
                      {node.title}
                    </h5>
                    <span className="text-[10px] text-emerald-400/90 font-medium">
                      Phase {node.phase} • {node.status === "known" ? "Verified Prior Knowledge" : "Completed"}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
              </div>
            ))}

          {/* Moderate Gaps */}
          {(activeCategory === "all" || activeCategory === "moderate") &&
            moderateGaps.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-800/40 hover:border-amber-700/60 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-300">
                      {node.title}
                    </h5>
                    <span className="text-[10px] text-amber-400/90 font-medium">
                      Phase {node.phase} • {node.status === "in_progress" ? "Active In Progress" : "Available to Learn"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/60 font-medium">
                  Actionable
                </span>
              </div>
            ))}

          {/* Critical Gaps */}
          {(activeCategory === "all" || activeCategory === "critical") &&
            criticalGaps.map((node) => (
              <div
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between opacity-80 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Lock size={15} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-300 truncate group-hover:text-white">
                      {node.title}
                    </h5>
                    <span className="text-[10px] text-slate-500">
                      Phase {node.phase} • Locked (Prerequisites required)
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500">
                  {node.dependencies.length} deps
                </span>
              </div>
            ))}
          {strengths.length === 0 && moderateGaps.length === 0 && criticalGaps.length === 0 && totalNodes > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
              No skills in this category yet.
            </div>
          )}
        </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <p className="leading-relaxed">
          {totalNodes === 0
            ? "Gap analysis will appear once your roadmap is generated."
            : summary}
        </p>
      </div>
    </div>
  );
}
