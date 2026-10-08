"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { isProjectNode } from "@/lib/project-evidence";
import ProjectWorkspace from "@/components/ProjectWorkspace";
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
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes the panel; focus the close control on open for keyboard users.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, nodeId]);

  const node = roadmap?.nodes.find((n) => n.id === nodeId);
  const cachedDetail = nodeDetailCache[nodeId];
  const allNodes = useMemo(() => roadmap?.nodes ?? [], [roadmap]);
  const projectNode = node ? isProjectNode(node, allNodes) : false;

  // Fetch node detail if not in cache or node properties
  useEffect(() => {
    if (!node || !roadmap) return;

    // Project nodes carry their own workspace payload; skill nodes use the classic check.
    const isProject = isProjectNode(node, roadmap.nodes);
    const hasFullDetail =
      cachedDetail ||
      (node.why && node.actionItems && node.resources && (!isProject || node.milestones));

    if (hasFullDetail) {
      if (!cachedDetail && node.why && node.actionItems && node.resources) {
        updateNodeDetail(nodeId, {
          why: node.why,
          actionItems: node.actionItems,
          resources: node.resources,
          searchQuery: node.searchQuery || `${node.title} tutorial guide`,
          ...(node.difficulty !== undefined && { difficulty: node.difficulty }),
          ...(node.estimatedEffort !== undefined && { estimatedEffort: node.estimatedEffort }),
          ...(node.expectedOutcome !== undefined && { expectedOutcome: node.expectedOutcome }),
          ...(node.techStack !== undefined && { techStack: node.techStack }),
          ...(node.skillsDemonstrated !== undefined && { skillsDemonstrated: node.skillsDemonstrated }),
          ...(node.milestones !== undefined && { milestones: node.milestones }),
          ...(node.doneWhen !== undefined && { doneWhen: node.doneWhen }),
          ...(node.githubGuidance !== undefined && { githubGuidance: node.githubGuidance }),
          ...(node.readmeChecklist !== undefined && { readmeChecklist: node.readmeChecklist }),
          ...(node.portfolioDescription !== undefined && { portfolioDescription: node.portfolioDescription }),
          ...(node.interviewQuestions !== undefined && { interviewQuestions: node.interviewQuestions }),
          ...(node.portfolioEvidence !== undefined && { portfolioEvidence: node.portfolioEvidence }),
          ...(node.requirementMapping !== undefined && { requirementMapping: node.requirementMapping }),
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
            isProject,
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
        return <Video size={16} className="text-red-500" />;
      case "article":
        return <FileText size={16} className="text-blue-600" />;
      case "docs":
        return <BookOpen size={16} className="text-emerald-600" />;
      case "course":
        return <GraduationCap size={16} className="text-amber-600" />;
      case "tool":
        return <Wrench size={16} className="text-cyan-600" />;
      case "repo":
        return <Code2 size={16} className="text-violet-600" />;
      default:
        return <ExternalLink size={16} className="text-slate-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Node details: ${node.title}`}
      className="fixed z-40 bg-white border-slate-200 shadow-2xl flex flex-col animate-slide-in-right sm:animate-slide-in-right inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-lg sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-l"
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden pt-2 flex justify-center" aria-hidden>
        <span className="h-1 w-10 rounded-full bg-slate-300" />
      </div>
      {/* Top Header */}
      <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
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
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={12} />
              {formatHours(node.estimatedHours)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{node.title}</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{node.description}</p>
        </div>
        <button
          ref={closeRef}
          onClick={onClose}
          className="p-2 min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
          aria-label="Close node details"
        >
          <X size={20} />
        </button>
      </div>

      {/* Status Controls */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500">Update Status:</span>
        <div className="flex gap-1.5 flex-wrap">
          {(["available", "in_progress", "completed", "known"] as NodeStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                node.status === st
                  ? "bg-blue-600 text-white border border-blue-600 shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              {st === "known" ? "💜 Known" : st === "completed" ? "✅ Done" : st === "in_progress" ? "⚡ Active" : "🎯 Ready"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs — skill nodes keep the classic action-pack experience */}
      {!projectNode && (
      <div className="flex border-b border-slate-200 px-5 bg-white">
        <button
          onClick={() => setActiveTab("action")}
          className={cn(
            "py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors",
            activeTab === "action"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          <Search size={14} />
          Deep Dive
        </button>
      </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <p className="text-sm font-medium text-slate-600">
              {projectNode
                ? "Generating project workspace with AI..."
                : "Generating personalized action pack with AI..."}
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              {projectNode
                ? "Planning milestones, portfolio evidence, and GitHub guidance specific to this project."
                : "Tailoring steps, curated resources, and curriculum specific to your career goal."}
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle size={16} />
              Could not generate details
            </div>
            <p className="text-xs text-red-600">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
              className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-xs text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        ) : projectNode && roadmap ? (
          <ProjectWorkspace node={node} allNodes={allNodes} goal={roadmap.goal} />
        ) : (
          <>
            {/* Action Items Tab */}
            {activeTab === "action" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
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
                            ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => toggleActionItem(node.id, item.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    <Sparkles size={14} />
                    Strategic Importance
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {detail.why ||
                      `${node.title} is an essential stepping stone to bridge your foundational knowledge toward mastery for your target role.`}
                  </p>
                </div>

                {node.dependencies.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2">
                      Prerequisites:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
                      {node.dependencies.map((depId) => {
                        const depNode = roadmap?.nodes.find((n) => n.id === depId);
                        return (
                          <li key={depId}>
                            <span className="font-medium text-slate-700">
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
                <p className="text-xs text-slate-500 mb-2">
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
                        className="flex items-center justify-between p-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getResourceIcon(res.type)}
                          <div className="min-w-0">
                            <h5 className="text-xs font-medium text-slate-700 group-hover:text-blue-700 transition-colors truncate">
                              {res.title}
                            </h5>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {res.type}
                            </span>
                          </div>
                        </div>
                        <ExternalLink
                          size={14}
                          className="text-slate-400 group-hover:text-slate-600 flex-shrink-0 ml-2"
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
                <p className="text-xs text-slate-500">
                  Pre-crafted search query optimized for high-signal documentation, tutorials, and real-world implementations:
                </p>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <code className="text-xs text-blue-700 font-mono break-all">
                    {detail.searchQuery}
                  </code>
                  <button
                    onClick={handleCopySearch}
                    className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors flex-shrink-0"
                    title="Copy query"
                  >
                    {copiedQuery ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      detail.searchQuery || `${node.title} tutorial`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
                    className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button
          onClick={() => handleStatusChange("known")}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1"
        >
          💜 I already know this skill
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
