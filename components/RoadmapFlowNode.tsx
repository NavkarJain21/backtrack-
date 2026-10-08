"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn, getStatusBg, getStatusLabel, formatHours } from "@/lib/utils";
import type { RoadmapNode } from "@/lib/schemas";
import type { RoadmapNodeKind } from "@/lib/roadmap-graph";
import {
  Clock,
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
  Target,
  BookOpen,
  Hammer,
  Briefcase,
  Award,
  Flag,
  MapPin,
} from "lucide-react";

export type RoadmapNodeData = RoadmapNode & {
  onClick?: (id: string) => void;
  isSelected?: boolean;
  /** Inferred from the node's own tags/title/graph position. */
  kind?: RoadmapNodeKind;
  isYouAreHere?: boolean;
  isCritical?: boolean;
  /** True when the node is dimmed by search/filter (never removed). */
  isDimmed?: boolean;
  /** 0-100 action-item completion for in-progress indicator. */
  actionProgress?: number;
  /** Prerequisite titles for the locked tooltip. */
  missingDeps?: string[];
};

function KindIcon({ kind }: { kind: RoadmapNodeKind }) {
  const cls = "shrink-0";
  switch (kind) {
    case "project":
      return <Hammer size={13} className={cn(cls, "text-teal-300/90")} aria-hidden />;
    case "role":
      return <Briefcase size={13} className={cn(cls, "text-sky-300/90")} aria-hidden />;
    case "credential":
      return <Award size={13} className={cn(cls, "text-amber-300/90")} aria-hidden />;
    case "goal":
      return <Flag size={13} className={cn(cls, "text-rose-300/90")} aria-hidden />;
    case "skill":
    default:
      return <BookOpen size={13} className={cn(cls, "text-indigo-300/90")} aria-hidden />;
  }
}

const KIND_LABEL: Record<RoadmapNodeKind, string> = {
  skill: "Skill",
  project: "Project",
  role: "Role",
  credential: "Credential",
  goal: "Goal",
};

/** Restrained per-kind accent (dark premium — never rainbow). */
function getKindAccent(kind: RoadmapNodeKind): string {
  switch (kind) {
    case "project":
      return "bg-teal-400/80";
    case "role":
      return "bg-sky-400/80";
    case "credential":
      return "bg-amber-400/80";
    case "goal":
      return "bg-rose-400/80";
    case "skill":
    default:
      return "bg-indigo-400/80";
  }
}

function StatusIcon({ status }: { status: RoadmapNode["status"] }) {
  switch (status) {
    case "locked":
      return <Lock size={11} aria-hidden />;
    case "completed":
      return <CheckCircle2 size={11} aria-hidden />;
    case "known":
      return <Sparkles size={11} aria-hidden />;
    case "in_progress":
      return <Zap size={11} aria-hidden />;
    case "available":
      return <Target size={11} aria-hidden />;
    default:
      return null;
  }
}

function RoadmapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as RoadmapNodeData;
  const {
    id,
    title,
    status,
    estimatedHours,
    onClick,
    isSelected,
    kind = "skill",
    isYouAreHere = false,
    isCritical = false,
    isDimmed = false,
    actionProgress,
    missingDeps = [],
  } = nodeData;

  const locked = status === "locked";
  const active = selected || isSelected;

  const ariaLabel = `${title} — ${KIND_LABEL[kind]}, ${getStatusLabel(status)}${
    isYouAreHere ? ", you are here" : ""
  }${isCritical ? ", on critical path" : ""}${
    locked && missingDeps.length > 0
      ? `. Locked. Requires: ${missingDeps.join(", ")}`
      : ""
  }`;

  return (
    <div
      className={cn(
        "roadmap-node group relative rounded-xl border-2 w-64 cursor-pointer",
        "bg-slate-900/95 shadow-lg backdrop-blur-sm",
        "transition-[box-shadow,border-color,transform,opacity] duration-200",
        "outline-none",
        getStatusBg(status),
        locked && "border-dashed opacity-70",
        // Available: strong but restrained emphasis
        status === "available" &&
          "shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_8px_24px_-8px_rgba(59,130,246,0.45)]",
        // Critical path: subtle amber edge emphasis (non-critical stays visible)
        isCritical && !locked && "border-amber-400/40",
        // Hover / selected / focus
        "hover:-translate-y-0.5 hover:shadow-xl hover:border-slate-400",
        active && "ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.03]",
        "focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        isDimmed && "opacity-30 saturate-50"
      )}
      onClick={() => onClick?.(id)}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-disabled={locked || undefined}
      aria-current={isYouAreHere || undefined}
      title={
        locked && missingDeps.length > 0
          ? `Locked — requires: ${missingDeps.join(", ")}`
          : `${KIND_LABEL[kind]} · ${getStatusLabel(status)}`
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(id);
        }
      }}
    >
      {/* Kind accent hairline */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-full opacity-70",
          getKindAccent(kind)
        )}
      />

      {/* You-are-here halo */}
      {isYouAreHere && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[3px] rounded-[14px] border-2 border-cyan-300/70 animate-pulse-glow"
        />
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
        aria-hidden
      />

      <div className="p-4 pt-3.5">
        {/* You are here badge */}
        {isYouAreHere && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-cyan-950/90 border border-cyan-700/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
            <MapPin size={10} aria-hidden />
            You are here
          </div>
        )}

        {/* Kind + status row */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <KindIcon kind={kind} />
            {KIND_LABEL[kind]}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
              status === "locked" && "border-slate-700 text-slate-500",
              status === "available" && "border-blue-700/70 text-blue-300",
              status === "in_progress" && "border-amber-700/70 text-amber-300",
              status === "completed" && "border-emerald-700/70 text-emerald-300",
              status === "known" && "border-purple-700/70 text-purple-300"
            )}
          >
            <StatusIcon status={status} />
            {getStatusLabel(status).replace(/^[^\s]+\s/, "")}
          </span>
        </div>

        {/* Title */}
        <h3
          className={cn(
            "font-semibold text-sm leading-tight mb-2",
            locked ? "text-slate-500" : "text-slate-100"
          )}
        >
          {title}
        </h3>

        {/* Locked prerequisites hint */}
        {locked && missingDeps.length > 0 && (
          <p className="mb-2 text-[11px] leading-snug text-slate-500">
            <Lock size={10} className="mr-1 inline" aria-hidden />
            Requires: {missingDeps.slice(0, 2).join(", ")}
            {missingDeps.length > 2 ? ` +${missingDeps.length - 2} more` : ""}
          </p>
        )}

        {/* In-progress indicator */}
        {status === "in_progress" && (
          <div className="mb-2" aria-hidden={!actionProgress}>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/60">
              {typeof actionProgress === "number" ? (
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, actionProgress))}%` }}
                />
              ) : (
                <div className="shimmer h-full w-full rounded-full" />
              )}
            </div>
            {typeof actionProgress === "number" && (
              <span className="sr-only">{Math.round(actionProgress)}% of action items done</span>
            )}
          </div>
        )}

        {/* Footer: duration + critical marker */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
            <Clock size={10} aria-hidden />
            {formatHours(estimatedHours)}
          </span>
          {isCritical && (
            <span className="text-[10px] font-medium text-amber-300/70">
              ◆ critical
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
        aria-hidden
      />
    </div>
  );
}

export const RoadmapFlowNode = memo(RoadmapNodeComponent);
