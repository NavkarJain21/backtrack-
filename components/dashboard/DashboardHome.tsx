"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeDashboardMetrics } from "@/lib/career-intelligence";
import { formatHours, cn } from "@/lib/utils";
import NextBestActionCard from "./NextBestActionCard";
import CareerDNACard from "./CareerDNACard";
import GapAnalysisCard from "./GapAnalysisCard";
import {
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  FolderGit2,
  Award,
  Milestone,
  GitFork,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface DashboardHomeProps {
  onOpenNode: (nodeId: string) => void;
  onOpenAdjust: () => void;
  onContinueRoadmap: () => void;
}

export default function DashboardHome({
  onOpenNode,
  onOpenAdjust,
  onContinueRoadmap,
}: DashboardHomeProps) {
  const { roadmap } = useStore();

  const metrics = useMemo(() => {
    return computeDashboardMetrics(roadmap);
  }, [roadmap]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Executive Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Career Target Strategy
            </span>
            <span className="text-slate-300 text-xs">•</span>
            <span className="text-xs text-slate-500">Active Pipeline</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {metrics.targetRole}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dependency-driven career execution plan calibrated against real-world competencies and portfolio artifacts.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onOpenAdjust}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Sparkles size={14} className="text-violet-600" />
            <span>I already know...</span>
          </button>

          <button
            onClick={onContinueRoadmap}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Continue Roadmap</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Overall Progress */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Overall Progress</span>
            <Award size={14} className="text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">{metrics.overallProgress}%</div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${metrics.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Current Phase */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Current Phase</span>
            <Layers size={14} className="text-violet-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            Phase {metrics.currentPhase}
          </div>
          <div className="text-[11px] text-slate-500">of {metrics.totalPhases} phases</div>
        </div>

        {/* Metric 3: Time Remaining */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Estimated Remaining</span>
            <Clock size={14} className="text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {formatHours(metrics.hoursRemaining)}
          </div>
          <div className="text-[11px] text-slate-500">of {formatHours(metrics.totalHours)} total</div>
        </div>

        {/* Metric 4: Skills Completed */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Skills Mastered</span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {metrics.skillsCompleted}
          </div>
          <div className="text-[11px] text-slate-500">verified skills</div>
        </div>

        {/* Metric 5: Skills Remaining */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Skills In Queue</span>
            <TrendingUp size={14} className="text-cyan-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {metrics.skillsRemaining}
          </div>
          <div className="text-[11px] text-slate-500">to complete</div>
        </div>

        {/* Metric 6: Projects Completed */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Capstones</span>
            <FolderGit2 size={14} className="text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900">
            {metrics.projectsCompleted}/{metrics.totalProjects}
          </div>
          <div className="text-[11px] text-slate-500">portfolio deliverables</div>
        </div>
      </div>

      {/* Hero: Next Best Action Card */}
      <NextBestActionCard onOpenNode={onOpenNode} />

      {/* 2-Column: Career DNA & Gap Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CareerDNACard />
        <GapAnalysisCard onSelectNode={onOpenNode} />
      </div>

      {/* Next Milestone & Roadmap Preview Strip */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
            <Milestone size={20} />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-amber-600 tracking-wider">
              Upcoming Phase Milestone
            </div>
            <div className="text-sm font-bold text-slate-900">{metrics.nextMilestone}</div>
          </div>
        </div>

        <button
          onClick={onContinueRoadmap}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5 group"
        >
          <span>Explore Interactive Dependency Graph</span>
          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
