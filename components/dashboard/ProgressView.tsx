"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeProgress, formatHours, getPhaseColor, getPhaseBorderColor, cn } from "@/lib/utils";
import { TrendingUp, Clock, CheckCircle2, Award, Calendar, Layers } from "lucide-react";

export default function ProgressView() {
  const { roadmap } = useStore();

  const metrics = useMemo(() => {
    if (!roadmap) return null;
    const progress = computeProgress(roadmap.nodes);
    const totalHours = roadmap.nodes.reduce((acc, n) => acc + n.estimatedHours, 0);
    const completedHours = roadmap.nodes
      .filter((n) => n.status === "completed" || n.status === "known")
      .reduce((acc, n) => acc + n.estimatedHours, 0);
    const remainingHours = totalHours - completedHours;

    // Group nodes by phase
    const phaseMap = new Map<number, typeof roadmap.nodes>();
    roadmap.nodes.forEach((n) => {
      const list = phaseMap.get(n.phase) || [];
      list.push(n);
      phaseMap.set(n.phase, list);
    });

    const phases = [...phaseMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([phaseNum, nodes]) => {
        const done = nodes.filter((n) => n.status === "completed" || n.status === "known").length;
        const total = nodes.length;
        const pct = Math.round((done / total) * 100);
        const hours = nodes.reduce((a, n) => a + n.estimatedHours, 0);
        return { phaseNum, nodes, done, total, pct, hours };
      });

    return { progress, totalHours, completedHours, remainingHours, phases };
  }, [roadmap]);

  if (!metrics) return null;

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="text-cyan-600" size={24} />
            Progress & Velocity Calibration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking mastery across phases, study hours, and competency milestones.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">{metrics.progress.percentage}%</div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Completion</div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Verified Knowledge</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {metrics.progress.completed + metrics.progress.known} / {metrics.progress.total}
          </div>
          <p className="text-[11px] text-slate-500">
            {metrics.progress.known} verified prior skills, {metrics.progress.completed} newly completed
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Study Hours Burned</span>
            <Clock size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatHours(metrics.completedHours)}
          </div>
          <p className="text-[11px] text-slate-500">
            Invested out of {formatHours(metrics.totalHours)} total roadmap commitment
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Remaining Runway</span>
            <Calendar size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatHours(metrics.remainingHours)}
          </div>
          <p className="text-[11px] text-slate-500">
            Estimated time to achieve full target role readiness
          </p>
        </div>
      </div>

      {/* Phase Progression Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers size={18} className="text-violet-600" />
          Phase Progression Matrix
        </h2>

        <div className="space-y-4">
          {metrics.phases.map((ph) => (
            <div
              key={ph.phaseNum}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-xs font-bold border bg-white",
                      getPhaseBorderColor(ph.phaseNum),
                      "text-slate-700"
                    )}
                  >
                    Phase {ph.phaseNum}
                  </span>
                  <span className="text-slate-600 font-medium">
                    {ph.done} of {ph.total} Skills Cleared
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">{formatHours(ph.hours)}</span>
                  <span className="font-bold text-slate-900 w-8 text-right">{ph.pct}%</span>
                </div>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${ph.pct}%` }}
                />
              </div>

              {/* Node pills in phase */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ph.nodes.map((n) => (
                  <span
                    key={n.id}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded border",
                      n.status === "completed" || n.status === "known"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : n.status === "in_progress"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : n.status === "available"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {n.title}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
