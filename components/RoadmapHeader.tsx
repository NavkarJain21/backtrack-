"use client";

import { useStore } from "@/lib/store";
import { computeProgress, formatHours } from "@/lib/utils";
import {
  Sparkles,
  RotateCcw,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  Award,
} from "lucide-react";

interface RoadmapHeaderProps {
  onOpenAdjust: () => void;
}

export default function RoadmapHeader({ onOpenAdjust }: RoadmapHeaderProps) {
  const { roadmap, reset, isRefining } = useStore();

  if (!roadmap) return null;

  const { completed, known, total, percentage } = computeProgress(roadmap.nodes);
  const totalHours = roadmap.nodes.reduce((acc, n) => acc + n.estimatedHours, 0);
  const completedHours = roadmap.nodes
    .filter((n) => n.status === "completed" || n.status === "known")
    .reduce((acc, n) => acc + n.estimatedHours, 0);

  const handleReset = () => {
    if (window.confirm("Start a new roadmap? Your current progress will be reset.")) {
      reset();
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand + Goal */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30 flex-shrink-0">
            <Compass size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Backtrack
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="text-xs text-slate-400">Target Role</span>
            </div>
            <h1 className="text-sm md:text-base font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
              {roadmap.goal}
            </h1>
          </div>
        </div>

        {/* Center: Progress & Hours */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-center">
          <div className="flex flex-col gap-1 w-44 sm:w-56">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Award size={12} className="text-amber-400" />
                Progress
              </span>
              <span className="font-bold text-white">{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 border-l border-slate-800 pl-4">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>
                {completed + known}/{total} nodes
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={13} className="text-blue-400" />
              <span>
                {formatHours(completedHours)} / {formatHours(totalHours)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenAdjust}
            disabled={isRefining}
            className="flex-1 md:flex-initial px-3.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-purple-950/50"
          >
            <Sparkles size={14} className="text-purple-400" />
            I already know...
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
            title="Start new roadmap"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
