"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeNextBestAction } from "@/lib/career-intelligence";
import {
  Compass,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
  Unlock,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { formatHours, cn } from "@/lib/utils";

interface NextBestActionCardProps {
  onOpenNode: (nodeId: string) => void;
}

export default function NextBestActionCard({ onOpenNode }: NextBestActionCardProps) {
  const { roadmap, updateNodeStatus } = useStore();

  const actionData = useMemo(() => {
    return computeNextBestAction(roadmap?.nodes || []);
  }, [roadmap?.nodes]);

  const { node, reason, unlockedDownstreamCount, estimatedHours } = actionData;

  if (!node) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <p className="text-xs text-slate-500 leading-relaxed">
          No actionable next step yet. Generate a roadmap to identify your highest-ROI next skill.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-violet-50 border border-blue-200 p-5 shadow-sm">
      {/* Background ambient accent */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Information */}
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold">
              <Zap size={12} className="text-amber-500" />
              What Should I Do Next?
            </span>
            <span className="text-xs text-slate-500">• Highest ROI Next Step</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
              {node.title}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                Phase {node.phase}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                <Clock size={11} />
                {formatHours(estimatedHours)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {reason}
          </p>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {node.status !== "known" && (
            <button
              onClick={() => updateNodeStatus(node.id, "known")}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              title="Mark this skill as already mastered"
            >
              <Sparkles size={13} className="text-violet-600" />
              Already Know This
            </button>
          )}

          <button
            onClick={() => onOpenNode(node.id)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Open Action Pack</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
