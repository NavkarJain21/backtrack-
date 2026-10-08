"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn, getStatusBg, getStatusLabel, formatHours } from "@/lib/utils";
import type { RoadmapNode } from "@/lib/schemas";
import { Clock, Tag } from "lucide-react";

export type RoadmapNodeData = RoadmapNode & {
  onClick?: (id: string) => void;
  isSelected?: boolean;
};

function RoadmapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as RoadmapNodeData;
  const {
    id,
    title,
    description,
    status,
    estimatedHours,
    tags,
    onClick,
    isSelected,
  } = nodeData;

  const locked = status === "locked";

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-4 w-64 cursor-pointer transition-all duration-200",
        "shadow-lg hover:shadow-xl",
        getStatusBg(status),
        locked ? "opacity-60" : "opacity-100",
        (selected || isSelected)
          ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105"
          : "hover:scale-102",
      )}
      onClick={() => !locked && onClick?.(id)}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-label={`${title} - ${getStatusLabel(status)}`}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !locked) {
          e.preventDefault();
          onClick?.(id);
        }
      }}
    >
      {/* Top handle (incoming dependencies) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
      />

      {/* Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70">
          {getStatusLabel(status)}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock size={10} />
          {formatHours(estimatedHours)}
        </span>
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-sm leading-tight mb-1",
          locked ? "text-gray-500" : "text-gray-100"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-snug line-clamp-2 mb-2">
        {description}
      </p>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/20">
          <span className="text-2xl opacity-30">🔒</span>
        </div>
      )}

      {/* Bottom handle (outgoing to dependents) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
      />
    </div>
  );
}

export const RoadmapFlowNode = memo(RoadmapNodeComponent);
