"use client";

import { useStore } from "@/lib/store";
import { Settings, Cpu, HardDrive, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsView() {
  const { roadmap, reset, lastGoal } = useStore();

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your current roadmap? This will clear all local progress and return to the role generator.")) {
      reset();
      toast.success("Roadmap reset successfully.");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-slate-400" size={24} />
          Platform Settings & Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure AI model inference, local cache parameters, and session state.
        </p>
      </div>

      {/* AI Model Architecture Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-950 border border-blue-800/60 text-blue-400">
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Inference Configuration</h2>
            <p className="text-xs text-slate-400">Anthropic Claude Sonnet 4.5 via Server-side Tool Use</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400">Structured Tool Handler</span>
            <div className="text-xs font-mono font-semibold text-blue-300">
              generate_roadmap / adjust_roadmap
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <span className="text-[11px] text-slate-400">Schema Validation</span>
            <div className="text-xs font-mono font-semibold text-emerald-300">
              Strict Zod v4 Runtime Guard
            </div>
          </div>
        </div>
      </div>

      {/* Local Storage & Security */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-950 border border-purple-800/60 text-purple-400">
            <HardDrive size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Zero-Database Client Persistence</h2>
            <p className="text-xs text-slate-400">Encrypted in browser localStorage via Zustand persist middleware</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Active Storage Key:</span>
            <span className="font-mono text-purple-300">backtrack-store</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Cached Nodes:</span>
            <span className="font-mono text-slate-200">{(roadmap?.nodes || []).length} nodes</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
          <AlertTriangle size={15} />
          Danger Zone
        </div>
        <p className="text-xs text-slate-400">
          Resetting your roadmap permanently removes all local progress and clears your active pipeline.
        </p>

        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 text-xs font-semibold transition-colors flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Reset Active Roadmap
        </button>
      </div>
    </div>
  );
}
