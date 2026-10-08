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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">I Already Know...</h3>
              <p className="text-xs text-slate-500">
                Accelerate your roadmap by marking existing skills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRefining}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tell us what background or skills you already have:
            </label>
            <textarea
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              disabled={isRefining}
              placeholder="e.g., I have 3 years of experience with Python and SQL, and I'm very comfortable with Git and Linux basics."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Quick chips from roadmap */}
          {earlyNodes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lightbulb size={12} className="text-amber-500" />
                <span>Quick-select skills from your roadmap:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {earlyNodes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleAddChip(n.title)}
                    disabled={isRefining}
                    className="px-2.5 py-1 rounded-full text-xs bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shadow-sm"
                  >
                    + {n.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRefining}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRefining || !statement.trim()}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
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
