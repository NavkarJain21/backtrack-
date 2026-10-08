"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { X, Sparkles, RefreshCw, CheckCircle, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";

interface AdjustRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdjustRoadmapModal({ isOpen, onClose }: AdjustRoadmapModalProps) {
  const { roadmap, applyAdjustment, isRefining, setIsRefining } = useStore();
  const [statement, setStatement] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !roadmap) return null;

  // Extract suggestions from early phases of the current roadmap
  const earlyNodes = roadmap.nodes
    .filter((n) => n.phase <= 2 && n.status !== "known")
    .slice(0, 6);

  const handleAddChip = (title: string) => {
    if (!statement) {
      setStatement(`I already know ${title}`);
    } else if (!statement.toLowerCase().includes(title.toLowerCase())) {
      setStatement(`${statement}, and ${title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      setError("Please describe what skills you already have.");
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const res = await fetch("/api/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statement: statement.trim(),
          currentRoadmap: roadmap,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to refine roadmap (${res.status})`);
      }

      const data = await res.json();
      applyAdjustment(data);

      toast.success(
        data.summary || `Updated roadmap! Marked ${data.matchedNodeIds?.length || 0} skills as known.`,
        { duration: 4000 }
      );
      onClose();
      setStatement("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Adjustment failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-900/50 border border-purple-700 text-purple-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">I Already Know...</h3>
              <p className="text-xs text-slate-400">
                Accelerate your roadmap by marking existing skills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRefining}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tell us what background or skills you already have:
            </label>
            <textarea
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              disabled={isRefining}
              placeholder="e.g., I have 3 years of experience with Python and SQL, and I'm very comfortable with Git and Linux basics."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Quick chips from roadmap */}
          {earlyNodes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lightbulb size={12} className="text-amber-400" />
                <span>Quick-select skills from your roadmap:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {earlyNodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleAddChip(n.title)}
                    disabled={isRefining}
                    className="px-2.5 py-1 rounded-full text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                  >
                    + {n.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 p-2.5 rounded-lg border border-red-800/50">
              {error}
            </p>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRefining}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRefining || !statement.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isRefining ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Replanning Roadmap...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Update Roadmap
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
