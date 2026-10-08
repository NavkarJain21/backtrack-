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
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="text-slate-500" size={24} />
          Platform Settings & Engine
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure AI model inference, local cache parameters, and session state.
        </p>
      </div>

      {/* AI Model Architecture Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI Inference Configuration</h2>
            <p className="text-xs text-slate-500">Anthropic Claude Sonnet 4.5 via Server-side Tool Use</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] text-slate-500">Structured Tool Handler</span>
            <div className="text-xs font-mono font-semibold text-blue-700">
              generate_roadmap / adjust_roadmap
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] text-slate-500">Schema Validation</span>
            <div className="text-xs font-mono font-semibold text-emerald-700">
              Strict Zod v4 Runtime Guard
            </div>
          </div>
        </div>
      </div>

      {/* Local Storage & Security */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-600">
            <HardDrive size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Zero-Database Client Persistence</h2>
            <p className="text-xs text-slate-500">Encrypted in browser localStorage via Zustand persist middleware</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Active Storage Key:</span>
            <span className="font-mono text-violet-700">backtrack-store</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cached Nodes:</span>
            <span className="font-mono text-slate-700">{(roadmap?.nodes || []).length} nodes</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-50/60 border border-red-200 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider">
          <AlertTriangle size={15} />
          Danger Zone
        </div>
        <p className="text-xs text-slate-500">
          Resetting your roadmap permanently removes all local progress and clears your active pipeline.
        </p>

        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={13} />
          Reset Active Roadmap
        </button>
      </div>
    </div>
  );
}
