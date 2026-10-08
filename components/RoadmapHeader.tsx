"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  formatRemaining,
  getCurrentPhase,
  getPhaseSummaries,
  getRoadmapProgress,
  getYouAreHereId,
} from "@/lib/roadmap-graph";
import {
  Sparkles,
  RotateCcw,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  MapPin,
} from "lucide-react";

interface RoadmapHeaderProps {
  onOpenAdjust: () => void;
}

export default function RoadmapHeader({ onOpenAdjust }: RoadmapHeaderProps) {
  const { roadmap, reset, isRefining } = useStore();

  const stats = useMemo(() => {
    if (!roadmap) return null;
    const progress = getRoadmapProgress(roadmap.nodes);
    const currentPhase = getCurrentPhase(roadmap.nodes);
    const totalPhases = getPhaseSummaries(roadmap.nodes).length;
    const hereId = getYouAreHereId(roadmap.nodes);
    const hereNode = hereId
      ? roadmap.nodes.find((n) => n.id === hereId) ?? null
      : null;
    return { progress, currentPhase, totalPhases, hereNode };
  }, [roadmap]);

  if (!roadmap || !stats) return null;

  const { progress, currentPhase, totalPhases, hereNode } = stats;

  const handleReset = () => {
    if (window.confirm("Start a new roadmap? Your current progress will be reset.")) {
      reset();
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white px-3 sm:px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Row 1: brand + actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25 flex-shrink-0">
              <Compass size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  Backtrack
                </span>
                <span className="text-slate-300 text-xs" aria-hidden>•</span>
                <span className="text-xs text-slate-500">Target Role</span>
              </div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 truncate max-w-[220px] sm:max-w-md md:max-w-lg">
                {roadmap.goal}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAdjust}
              disabled={isRefining}
              className="px-3.5 py-2 min-h-[36px] rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Sparkles size={14} className="text-violet-600" aria-hidden />
              <span className="hidden sm:inline">I already know...</span>
              <span className="sm:hidden">Know...</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 min-h-[36px] min-w-[36px] rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors flex items-center justify-center shadow-sm"
              title="Start new roadmap"
              aria-label="Start new roadmap"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: live workspace stats — all derived from roadmap state */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2"
          aria-label="Roadmap status summary"
        >
          {/* Overall progress */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Award size={12} className="text-amber-500" aria-hidden />
                Overall Progress
              </span>
              <span className="font-bold text-slate-900" aria-live="polite">
                {progress.percentage}%
              </span>
            </div>
            <div
              className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Overall progress ${progress.percentage} percent`}
            >
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <CheckCircle2 size={11} className="text-emerald-600" aria-hidden />
              {progress.completed + progress.known}/{progress.total} nodes
            </div>
          </div>

          {/* Current phase */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mb-1">
              <Layers size={12} className="text-violet-600" aria-hidden />
              Current Phase
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              Phase {currentPhase}{" "}
              <span className="text-[11px] font-medium text-slate-500">
                of {totalPhases}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500" title={hereNode?.title ?? ""}>
              {hereNode ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={10} className="text-blue-600 shrink-0" aria-hidden />
                  <span className="truncate">{hereNode.title}</span>
                </span>
              ) : (
                "All phases complete"
              )}
            </div>
          </div>

          {/* Estimated remaining */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 col-span-2 lg:col-span-2">
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mb-1">
              <Clock size={12} className="text-blue-600" aria-hidden />
              Estimated Completion
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-sm font-extrabold text-slate-900">
                {formatRemaining(progress.hoursRemaining)}{" "}
                <span className="text-[11px] font-medium text-slate-500">remaining</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {formatRemaining(progress.hoursDone)} done ·{" "}
                {formatRemaining(progress.hoursTotal)} total
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
