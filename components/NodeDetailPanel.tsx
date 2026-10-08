"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  getStatusBg,
  getStatusLabel,
  getStatusColor,
  formatHours,
  getSafeResourceUrl,
  cn,
} from "@/lib/utils";
import type { NodeStatus } from "@/lib/schemas";
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Search,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Video,
  FileText,
  Code2,
  GraduationCap,
  Wrench,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface NodeDetailPanelProps {
  nodeId: string;
  onClose: () => void;
}

export default function NodeDetailPanel({ nodeId, onClose }: NodeDetailPanelProps) {
  const {
    roadmap,
    nodeDetailCache,
    updateNodeDetail,
    updateNodeStatus,
    toggleActionItem,
    actionItemProgress,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"action" | "why" | "resources" | "search">("action");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const node = roadmap?.nodes.find((n) => n.id === nodeId);
  const cachedDetail = nodeDetailCache[nodeId];

  // Fetch node detail if not in cache or node properties
  useEffect(() => {
    if (!node || !roadmap) return;

    if (cachedDetail || (node.why && node.actionItems && node.resources)) {
      if (!cachedDetail && node.why && node.actionItems && node.resources) {
        updateNodeDetail(nodeId, {
          why: node.why,
          actionItems: node.actionItems,
          resources: node.resources,
          searchQuery: node.searchQuery || `${node.title} tutorial guide`,
        });
      }
      return;
    }

    let isCancelled = false;
    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/node-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId: node!.id,
            nodeTitle: node!.title,
            nodeDescription: node!.description,
            goal: roadmap!.goal,
            phase: node!.phase,
            tags: node!.tags,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load details (${res.status})`);
        }

        const data = await res.json();
        if (!isCancelled) {
          updateNodeDetail(node!.id, data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load node details";
          setError(msg);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchDetail();
    return () => {
      isCancelled = true;
    };
  }, [nodeId, node, roadmap, cachedDetail, updateNodeDetail]);

  if (!node) return null;

  const detail = cachedDetail || {
    why: node.why || "",
    actionItems: node.actionItems || [],
    resources: node.resources || [],
    searchQuery: node.searchQuery || `${node.title} tutorial`,
  };

  const actionItems = detail.actionItems || [];
  const resources = detail.resources || [];

  const handleStatusChange = (newStatus: NodeStatus) => {
    updateNodeStatus(node.id, newStatus);
    toast.success(`Marked as ${getStatusLabel(newStatus)}`);
  };

  const handleCopySearch = () => {
    if (!detail.searchQuery) return;
    navigator.clipboard.writeText(detail.searchQuery);
    setCopiedQuery(true);
    toast.success("Copied search query!");
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video size={16} className="text-red-400" />;
      case "article":
        return <FileText size={16} className="text-blue-400" />;
      case "docs":
        return <BookOpen size={16} className="text-emerald-400" />;
      case "course":
        return <GraduationCap size={16} className="text-amber-400" />;
      case "tool":
        return <Wrench size={16} className="text-cyan-400" />;
      case "repo":
        return <Code2 size={16} className="text-purple-400" />;
      default:
        return <ExternalLink size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/80 shadow-2xl flex flex-col animate-slide-in-right">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/60">
              Phase {node.phase}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold border",
                getStatusBg(node.status),
                getStatusColor(node.status)
              )}
            >
              {getStatusLabel(node.status)}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={12} />
              {formatHours(node.estimatedHours)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{node.title}</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{node.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close panel"
        >
          <X size={20} />
        </button>
      </div>

      {/* Status Controls */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-400">Update Status:</span>
        <div className="flex gap-1.5 flex-wrap">
          {(["available", "in_progress", "completed", "known"] as NodeStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                node.status === st
                  ? "bg-slate-700 text-white border border-slate-500 shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              {st === "known" ? "💜 Known" : st === "completed" ? "✅ Done" : st === "in_progress" ? "⚡ Active" : "🎯 Ready"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-5 bg-slate-900">
        <button
          onClick={() => setActiveTab("action")}
          className={cn(
            "py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors",
            activeTab === "action"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <CheckCircle2 size={14} />
          Action Pack ({actionItems.length})
        </button>
        <button
          onClick={() => setActiveTab("why")}
          className={cn(
            "py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors",
            activeTab === "why"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Sparkles size={14} />
          Why This Matters
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={cn(
            "py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors",
            activeTab === "resources"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <BookOpen size={14} />
          Resources ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={cn(
            "py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors",
            activeTab === "search"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          )}
        >
          <Search size={14} />
          Deep Dive
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-blue-400" />
            <p className="text-sm font-medium text-slate-300">
              Generating personalized action pack with AI...
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              Tailoring steps, curated resources, and curriculum specific to your career goal.
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle size={16} />
              Could not generate details
            </div>
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
              className="mt-2 px-3 py-1.5 bg-red-800/50 hover:bg-red-800 text-xs text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Action Items Tab */}
            {activeTab === "action" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Step-by-step learning checklist:</span>
                  <span>
                    {
                      actionItems.filter(
                        (i) => actionItemProgress[`${node.id}-${i.id}`] ?? i.completed
                      ).length
                    }{" "}
                    / {actionItems.length} completed
                  </span>
                </div>

                {actionItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No specific action items available.
                  </p>
                ) : (
                  actionItems.map((item, idx) => {
                    const isDone =
                      actionItemProgress[`${node.id}-${item.id}`] ?? item.completed;
                    return (
                      <label
                        key={item.id || idx}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                          isDone
                            ? "bg-slate-950/60 border-slate-800 text-slate-500 line-through"
                            : "bg-slate-800/40 border-slate-700/70 text-slate-200 hover:border-slate-600"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleActionItem(node.id, item.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-xs leading-relaxed select-none">
                          {item.text}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {/* Why Tab */}
            {activeTab === "why" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 text-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                    <Sparkles size={14} />
                    Strategic Importance
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {detail.why ||
                      `${node.title} is an essential stepping stone to bridge your foundational knowledge toward mastery for your target role.`}
                  </p>
                </div>

                {node.dependencies.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-800/40 border border-slate-700/60">
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">
                      Prerequisites:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                      {node.dependencies.map((depId) => {
                        const depNode = roadmap?.nodes.find((n) => n.id === depId);
                        return (
                          <li key={depId}>
                            <span className="font-medium text-slate-200">
                              {depNode?.title || depId}
                            </span>{" "}
                            ({depNode ? getStatusLabel(depNode.status) : "required"})
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Resources Tab */}
            {activeTab === "resources" && (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 mb-2">
                  Curated and verified learning materials:
                </p>
                {resources.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No resources linked yet.
                  </p>
                ) : (
                  resources.map((res, i) => {
                    const safeUrl = getSafeResourceUrl(res.url, res.title);
                    return (
                      <a
                        key={i}
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getResourceIcon(res.type)}
                          <div className="min-w-0">
                            <h5 className="text-xs font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                              {res.title}
                            </h5>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {res.type}
                            </span>
                          </div>
                        </div>
                        <ExternalLink
                          size={14}
                          className="text-slate-500 group-hover:text-slate-300 flex-shrink-0 ml-2"
                        />
                      </a>
                    );
                  })
                )}
              </div>
            )}

            {/* Deep Dive Search Query Tab */}
            {activeTab === "search" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Pre-crafted search query optimized for high-signal documentation, tutorials, and real-world implementations:
                </p>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <code className="text-xs text-cyan-300 font-mono break-all">
                    {detail.searchQuery}
                  </code>
                  <button
                    onClick={handleCopySearch}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex-shrink-0"
                    title="Copy query"
                  >
                    {copiedQuery ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      detail.searchQuery || `${node.title} tutorial`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Search size={14} />
                    Search Google
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                      detail.searchQuery || `${node.title} tutorial`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-red-600/90 hover:bg-red-600 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Video size={14} />
                    Search YouTube
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <button
          onClick={() => handleStatusChange("known")}
          className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1"
        >
          💜 I already know this skill
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
