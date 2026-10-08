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
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={24} />
            Progress & Velocity Calibration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tracking mastery across phases, study hours, and competency milestones.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-white">{metrics.progress.percentage}%</div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Completion</div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified Knowledge</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.progress.completed + metrics.progress.known} / {metrics.progress.total}
          </div>
          <p className="text-[11px] text-slate-500">
            {metrics.progress.known} verified prior skills, {metrics.progress.completed} newly completed
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Study Hours Burned</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatHours(metrics.completedHours)}
          </div>
          <p className="text-[11px] text-slate-500">
            Invested out of {formatHours(metrics.totalHours)} total roadmap commitment
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Remaining Runway</span>
            <Calendar size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatHours(metrics.remainingHours)}
          </div>
          <p className="text-[11px] text-slate-500">
            Estimated time to achieve full target role readiness
          </p>
        </div>
      </div>

      {/* Phase Progression Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          Phase Progression Matrix
        </h2>

        <div className="space-y-4">
          {metrics.phases.map((ph) => (
            <div
              key={ph.phaseNum}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-xs font-bold border",
                      getPhaseBorderColor(ph.phaseNum),
                      "text-slate-200"
                    )}
                  >
                    Phase {ph.phaseNum}
                  </span>
                  <span className="text-slate-300 font-medium">
                    {ph.done} of {ph.total} Skills Cleared
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">{formatHours(ph.hours)}</span>
                  <span className="font-bold text-white w-8 text-right">{ph.pct}%</span>
                </div>
              </div>

              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
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
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                        : n.status === "in_progress"
                        ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
                        : n.status === "available"
                        ? "bg-blue-950/40 text-blue-300 border-blue-800/60"
                        : "bg-slate-900 text-slate-500 border-slate-800"
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
