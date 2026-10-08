"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getStatusBg, getStatusColor, getStatusLabel, formatHours, cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/schemas";

interface SkillsViewProps {
  onOpenNode: (nodeId: string) => void;
}

export default function SkillsView({ onOpenNode }: SkillsViewProps) {
  const { roadmap, updateNodeStatus } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  if (!roadmap) return null;

  const filteredNodes = roadmap.nodes.filter((node) => {
    const matchesStatus = filterStatus === "all" || node.status === filterStatus;
    const matchesSearch =
      node.title.toLowerCase().includes(search.toLowerCase()) ||
      node.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-blue-400" size={24} />
            Skills Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete competency catalog derived for: <span className="text-slate-200 font-semibold">{roadmap.goal}</span>
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {["all", "completed", "known", "in_progress", "available", "locked"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap",
                  filterStatus === st
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                {st === "all" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredNodes.map((node) => (
          <div
            key={node.id}
            className={cn(
              "p-4 rounded-xl border transition-all flex flex-col justify-between group",
              getStatusBg(node.status),
              "hover:border-slate-500/80 shadow-md"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                  Phase {node.phase}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded border",
                    getStatusColor(node.status)
                  )}
                >
                  {getStatusLabel(node.status)}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">
                {node.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                {node.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {node.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {formatHours(node.estimatedHours)}
              </span>

              <div className="flex items-center gap-2">
                {node.status !== "known" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNodeStatus(node.id, "known");
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Mark Known
                  </button>
                )}
                <button
                  onClick={() => onOpenNode(node.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  Inspect
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNodes.length === 0 && (
        <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
          No skills match your current search or filter criteria.
        </div>
      )}
    </div>
  );
}
