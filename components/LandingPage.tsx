"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  Compass,
  Sparkles,
  ArrowRight,
  GitFork,
  CheckCircle2,
  Cpu,
  Layers,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const EXAMPLE_ROLES = [
  "Staff AI Infrastructure Engineer at Anthropic",
  "Autonomous Drone Flight Software Engineer",
  "High-Frequency Crypto Trading Systems Developer",
  "Full-Stack Web3 Security Auditor",
  "Lead Game Engine Programmer in C++",
  "Senior Distributed Systems Engineer at Netflix",
];

const LOADING_STEPS = [
  "Analyzing target role competencies...",
  "Synthesizing prerequisite dependency tree...",
  "Balancing multi-phase learning curriculum...",
  "Calibrating estimated study hours...",
  "Finalizing interactive roadmap graph...",
];

export default function LandingPage() {
  const { setRoadmap, isGenerating, setIsGenerating, setLastGoal } = useStore();
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || goal.trim().length < 5) {
      setError("Please enter a specific dream job title (at least 5 characters).");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStepIndex(0);

    // Rotate loading text
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2400);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Roadmap generation failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.roadmap) {
        throw new Error("Invalid roadmap response from server.");
      }

      setLastGoal(goal.trim());
      setRoadmap(data.roadmap);
      toast.success("Roadmap generated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Soft decorative gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-100/70 via-violet-100/50 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
            <Compass size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Backtrack
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="hidden sm:inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Graph Engine Ready
          </span>
          <Link
            href="/sign-in"
            className="px-3 py-1.5 min-h-[36px] inline-flex items-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-semibold shadow-sm"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 mb-6 shadow-sm">
          <Sparkles size={13} className="text-amber-500" />
          <span>Reverse-engineer any career into a directed graph</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-[1.15]">
          What is your <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            hyper-specific dream job?
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed">
          Backtrack generates an interactive dependency-graph roadmap with personalized
          action packs, curated resources, and adaptive replanning.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mt-8">
          <div className="relative flex flex-col sm:flex-row items-stretch p-2 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g. Senior Distributed Systems Engineer at Netflix"
              className="flex-1 px-4 py-3 bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || !goal.trim()}
              className="mt-2 sm:mt-0 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Build Roadmap
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {/* Loading status indicator */}
          {isGenerating && (
            <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-center justify-center gap-2.5 animate-fade-in">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
              <span>{LOADING_STEPS[stepIndex]}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center justify-center gap-2 animate-fade-in">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Suggestion Chips */}
        <div className="mt-8 w-full max-w-2xl text-left">
          <p className="text-xs text-slate-400 mb-2.5 text-center sm:text-left">
            Or try one of these specific examples:
          </p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {EXAMPLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setGoal(role)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg text-xs bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 transition-colors shadow-sm"
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl text-left">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-blue-50 border border-blue-200 text-blue-600 mb-2.5">
              <GitFork size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              Dependency Graph
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Never get lost in linear lists. Understand what unlocks what with full DAG phases.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-violet-50 border border-violet-200 text-violet-600 mb-2.5">
              <Sparkles size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              Personalized Action Packs
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every node includes custom checklist tasks, strategic context, and vetted resources.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="p-2 w-fit rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 mb-2.5">
              <CheckCircle2 size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">
              "I Already Know..."
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tell Backtrack what you already know to immediately replan and accelerate your path.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-200 text-center text-xs text-slate-400">
        Backtrack — Career Dependency Engine. Built for high-velocity learning.
      </footer>
    </div>
  );
}
