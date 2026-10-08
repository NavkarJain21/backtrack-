"use client";

import { useStore } from "@/lib/store";
import { User, Target, Sparkles, CheckCircle2 } from "lucide-react";
import { computeProgress } from "@/lib/utils";

export default function ProfileView() {
  const { roadmap, lastGoal } = useStore();
  const progress = roadmap ? computeProgress(roadmap.nodes) : { completed: 0, known: 0, total: 0, percentage: 0 };
  const targetRole = roadmap?.goal || lastGoal || null;

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
            <User size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Your Career Profile</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Local profile • Sign-in not available yet
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right w-full sm:w-auto p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl border sm:border-0 border-slate-200">
          <div className="text-2xl font-black text-slate-900">{progress.percentage}%</div>
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Target Match Index</div>
        </div>
      </div>

      {/* Target Role & Career Ambition */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <Target size={15} />
          Active Dream Job Target
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          {targetRole ? (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {targetRole}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Personalized dependency roadmap calibrated across operational learning phases, real-time competency benchmarks, and verified milestone artifacts.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                No target role yet
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate a roadmap to set your target role. Your goal input will appear here.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Competency Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <CheckCircle2 size={15} />
            Verified Strengths
          </div>
          <div className="space-y-2">
            {(roadmap?.nodes || [])
              .filter((n) => n.status === "completed" || n.status === "known")
              .slice(0, 5)
              .map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                >
                  <span className="text-slate-700 font-medium">{n.title}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Verified</span>
                </div>
              ))}
            {(roadmap?.nodes || []).filter((n) => n.status === "completed" || n.status === "known").length === 0 && (
              <p className="text-xs text-slate-500 py-3">No skills verified yet. Mark known skills or complete milestones.</p>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-violet-600 uppercase tracking-wider">
            <Sparkles size={15} />
            High-Impact Target Focus
          </div>
          <div className="space-y-2">
            {(roadmap?.nodes || [])
              .filter((n) => n.status === "available" || n.status === "in_progress")
              .slice(0, 5)
              .map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                >
                  <span className="text-slate-700 font-medium">{n.title}</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Ready to Learn</span>
                </div>
              ))}
            {(roadmap?.nodes || []).filter((n) => n.status === "available" || n.status === "in_progress").length === 0 && (
              <p className="text-xs text-slate-500 py-3">
                {(roadmap?.nodes || []).length === 0
                  ? "No roadmap data yet."
                  : "No actionable skills right now. Complete prerequisites to unlock the next focus areas."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
