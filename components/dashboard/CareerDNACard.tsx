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
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
              <Dna size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Career DNA Profile
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  Graph-Derived
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Competency depth calculated across 5 core career dimensions
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-slate-900">{overallScore}</span>
            <span className="text-xs text-slate-500">/100</span>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              DNA Index
            </div>
          </div>
        </div>

        {/* Dimension Bars */}
        {dimensions.length === 0 ? (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed">
            No roadmap data yet. Generate a roadmap to populate your Career DNA profile.
          </div>
        ) : (
        <div className="space-y-3.5 mt-5">
          {dimensions.map((dim) => (
            <div key={dim.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span>{dim.name}</span>
                  <span className="text-[10px] text-slate-500">
                    ({dim.masteredSkills}/{dim.totalSkills} skills)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      dim.score >= 65
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : dim.score >= 35
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {dim.level}
                  </span>
                  <span className="font-bold text-slate-900 w-7 text-right">{dim.score}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    dim.color
                  )}
                  style={{ width: `${dim.score}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
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
      <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-amber-500" />
          <span>Real-time calibration based on verified roadmap nodes</span>
        </div>
        <span className="text-slate-500 font-mono">5 Dimensions</span>
      </div>
    </div>
  );
}
