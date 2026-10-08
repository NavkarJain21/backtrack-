"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeCareerDNA } from "@/lib/career-intelligence";
import { Dna, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CareerDNACard() {
  const { roadmap } = useStore();

  const dimensions = useMemo(() => {
    return computeCareerDNA(roadmap?.nodes || []);
  }, [roadmap?.nodes]);

  const overallScore = useMemo(() => {
    if (dimensions.length === 0) return 0;
    const sum = dimensions.reduce((acc, d) => acc + d.score, 0);
    return Math.round(sum / dimensions.length);
  }, [dimensions]);

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950 border border-blue-800/60 text-blue-400">
              <Dna size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Career DNA Profile
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                  Graph-Derived
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Competency depth calculated across 5 core career dimensions
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-white">{overallScore}</span>
            <span className="text-xs text-slate-400">/100</span>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              DNA Index
            </div>
          </div>
        </div>

        {/* Dimension Bars */}
        {dimensions.length === 0 ? (
          <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            No roadmap data yet. Generate a roadmap to populate your Career DNA profile.
          </div>
        ) : (
        <div className="space-y-3.5 mt-5">
          {dimensions.map((dim) => (
            <div key={dim.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-200">
                  <span>{dim.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({dim.masteredSkills}/{dim.totalSkills} skills)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      dim.score >= 65
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                        : dim.score >= 35
                        ? "bg-blue-950/60 text-blue-300 border-blue-800/60"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    )}
                  >
                    {dim.level}
                  </span>
                  <span className="font-bold text-white w-7 text-right">{dim.score}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    dim.color
                  )}
                  style={{ width: `${dim.score}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-tight">
                {dim.totalSkills === 0
                  ? "No matching roadmap nodes in this dimension yet."
                  : dim.description}
              </p>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-400" />
          <span>Real-time calibration based on verified roadmap nodes</span>
        </div>
        <span className="text-slate-400 font-mono">5 Dimensions</span>
      </div>
    </div>
  );
}
