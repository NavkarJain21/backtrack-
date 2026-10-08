"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RoadmapFlowNode, type RoadmapNodeData } from "./RoadmapFlowNode";
import type { Roadmap, RoadmapNode } from "@/lib/schemas";
import {
  computeCriticalPath,
  getNodeKinds,
  getPhaseSummaries,
  getRoadmapTimeline,
  getYouAreHereId,
  matchesFilter,
  matchesSearch,
  type NodeFilter,
  type RoadmapNodeKind,
} from "@/lib/roadmap-graph";
import {
  Search,
  X,
  BookOpen,
  Hammer,
  Briefcase,
  Award,
  Flag,
  LayoutGrid,
  Route,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nodeTypes = {
  roadmapNode: RoadmapFlowNode,
};

interface RoadmapCanvasProps {
  roadmap: Roadmap;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
}

const FILTERS: { value: NodeFilter; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "all", label: "All", Icon: LayoutGrid },
  { value: "skill", label: "Skills", Icon: BookOpen },
  { value: "project", label: "Projects", Icon: Hammer },
  { value: "role", label: "Roles", Icon: Briefcase },
  { value: "credential", label: "Credentials", Icon: Award },
  { value: "goal", label: "Goals", Icon: Flag },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Layout nodes into phase-lane columns, enriched with workspace state. */
function layoutNodes(
  nodes: RoadmapNode[],
  opts: {
    selectedNodeId: string | null;
    onNodeClick: (id: string) => void;
    kinds: Map<string, RoadmapNodeKind>;
    youAreHereId: string | null;
    criticalIds: Set<string>;
    query: string;
    filter: NodeFilter;
  }
): Node[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const phases = new Map<number, RoadmapNode[]>();
  for (const node of nodes) {
    const p = phases.get(node.phase) ?? [];
    p.push(node);
    phases.set(node.phase, p);
  }

  const PHASE_WIDTH = 320;
  const NODE_HEIGHT = 252;
  const NODE_GAP = 28;
  const PHASE_PADDING_TOP = 84;

  const result: Node[] = [];
  const sortedPhases = [...phases.keys()].sort((a, b) => a - b);

  for (const phase of sortedPhases) {
    const phaseNodes = phases.get(phase)!;
    const x = (phase - 1) * PHASE_WIDTH;

    phaseNodes.forEach((node, i) => {
      const kind = opts.kinds.get(node.id) ?? "skill";
      const dimmed =
        !matchesSearch(node, opts.query) || !matchesFilter(kind, opts.filter);

      const items = node.actionItems ?? [];
      const actionProgress =
        items.length > 0
          ? (items.filter((it) => it.completed).length / items.length) * 100
          : undefined;

      const missingDeps = (node.dependencies || [])
        .map((depId) => byId.get(depId)?.title ?? depId)
        .filter(Boolean);

      const y = PHASE_PADDING_TOP + i * (NODE_HEIGHT + NODE_GAP);
      result.push({
        id: node.id,
        type: "roadmapNode",
        position: { x, y },
        data: {
          ...node,
          onClick: opts.onNodeClick,
          isSelected: node.id === opts.selectedNodeId,
          kind,
          isYouAreHere: node.id === opts.youAreHereId,
          isCritical: opts.criticalIds.has(node.id),
          isDimmed: dimmed,
          actionProgress,
          missingDeps,
        } as RoadmapNodeData,
        selectable: true,
      });
    });
  }

  return result;
}

/** Build dependency edges. Critical edges get subtle amber emphasis. */
function buildEdges(
  nodes: RoadmapNode[],
  criticalEdgeIds: Set<string>,
  showCritical: boolean
): Edge[] {
  const reduced = prefersReducedMotion();
  const edges: Edge[] = [];
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      const edgeKey = `${dep}->${node.id}`;
      const isCritical = criticalEdgeIds.has(edgeKey);
      const emphasized = showCritical && isCritical;

      let stroke = "#3b82f6";
      if (node.status === "locked") stroke = "#475569";
      else if (node.status === "completed") stroke = "#059669";
      else if (node.status === "known") stroke = "#7c3aed";
      else if (node.status === "in_progress") stroke = "#d97706";
      if (emphasized) stroke = "#f59e0b";

      edges.push({
        id: edgeKey,
        source: dep,
        target: node.id,
        type: "smoothstep",
        animated: !reduced && node.status === "in_progress",
        zIndex: emphasized ? 5 : 0,
        style: {
          stroke,
          strokeWidth: emphasized ? 3 : 2,
          strokeDasharray: node.status === "locked" ? "5 5" : undefined,
          opacity: emphasized ? 1 : 0.85,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: emphasized ? 22 : 18,
          height: emphasized ? 22 : 18,
        },
      });
    }
  }
  return edges;
}

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() =>
        fitView({ padding: 0.15, duration: prefersReducedMotion() ? 0 : 400 })
      }
      className="px-3 py-1.5 min-h-[36px] bg-slate-900/95 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors shadow-lg"
      aria-label="Fit roadmap to view"
    >
      Fit View
    </button>
  );
}

export default function RoadmapCanvas({
  roadmap,
  selectedNodeId,
  onNodeClick,
}: RoadmapCanvasProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NodeFilter>("all");
  const [showCritical, setShowCritical] = useState(true);
  const [lanesOpen, setLanesOpen] = useState(false);

  const kinds = useMemo(() => getNodeKinds(roadmap.nodes), [roadmap.nodes]);
  const youAreHereId = useMemo(
    () => getYouAreHereId(roadmap.nodes),
    [roadmap.nodes]
  );
  const critical = useMemo(
    () => computeCriticalPath(roadmap.nodes),
    [roadmap.nodes]
  );
  const phaseSummaries = useMemo(
    () => getPhaseSummaries(roadmap.nodes),
    [roadmap.nodes]
  );
  const timeline = useMemo(
    () => getRoadmapTimeline(roadmap.nodes),
    [roadmap.nodes]
  );

  const visibleCount = useMemo(() => {
    return roadmap.nodes.filter((n) => {
      const kind = kinds.get(n.id) ?? "skill";
      return matchesSearch(n, query) && matchesFilter(kind, filter);
    }).length;
  }, [roadmap.nodes, kinds, query, filter]);

  const handleNodeClick = useCallback(
    (id: string) => onNodeClick(id),
    [onNodeClick]
  );

  const flowNodes = useMemo(
    () =>
      layoutNodes(roadmap.nodes, {
        selectedNodeId,
        onNodeClick: handleNodeClick,
        kinds,
        youAreHereId,
        criticalIds: showCritical ? critical.nodeIds : new Set<string>(),
        query,
        filter,
      }),
    [
      roadmap.nodes,
      selectedNodeId,
      handleNodeClick,
      kinds,
      youAreHereId,
      critical.nodeIds,
      showCritical,
      query,
      filter,
    ]
  );
  const flowEdges = useMemo(
    () => buildEdges(roadmap.nodes, critical.edgeIds, showCritical),
    [roadmap.nodes, critical.edgeIds, showCritical]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  return (
    <div className="w-full h-full relative" role="region" aria-label="Roadmap graph workspace">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        aria-label={`Career roadmap graph: ${roadmap.nodes.length} nodes`}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          className="!hidden sm:!block"
          nodeColor={(node) => {
            const d = node.data as RoadmapNodeData;
            switch (d.status) {
              case "completed":
                return "#059669";
              case "known":
                return "#7c3aed";
              case "in_progress":
                return "#d97706";
              case "available":
                return "#3b82f6";
              default:
                return "#475569";
            }
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
          aria-label="Roadmap minimap"
        />

        {/* ── Search + filter toolbar (top center) ── */}
        <Panel position="top-center">
          <div className="w-[calc(100vw-2rem)] max-w-xl rounded-xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-md shadow-xl p-2 space-y-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes, tags, or phase…"
                aria-label="Search roadmap nodes by title, type, or phase"
                className="w-full min-h-[36px] rounded-lg bg-slate-900 border border-slate-700 pl-8 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-200"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div
              role="group"
              aria-label="Filter nodes by type"
              className="flex gap-1 overflow-x-auto pb-0.5"
            >
              {FILTERS.map(({ value, label, Icon }) => {
                const pressed = filter === value;
                return (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    aria-pressed={pressed}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1.5 min-h-[32px] rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-colors",
                      pressed
                        ? "bg-cyan-950/80 border-cyan-700 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                    )}
                  >
                    <Icon size={12} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              {visibleCount} of {roadmap.nodes.length} nodes shown
            </span>
          </div>
        </Panel>

        {/* ── Phase lanes (top left) ── */}
        <Panel position="top-left">
          <div className="w-52 max-w-[calc(100vw-2rem)]">
            {/* Mobile: collapsible */}
            <button
              onClick={() => setLanesOpen((v) => !v)}
              aria-expanded={lanesOpen}
              aria-controls="phase-lanes"
              className="sm:hidden w-full px-3 py-2 min-h-[36px] rounded-lg bg-slate-950/95 border border-slate-700 text-xs font-semibold text-slate-200 shadow-lg"
            >
              {lanesOpen ? "Hide phases" : `Phases (${phaseSummaries.length})`}
            </button>
            <div
              id="phase-lanes"
              aria-label="Phase progress"
              className={cn(
                "mt-2 space-y-1.5 max-h-[38vh] overflow-y-auto pr-0.5",
                !lanesOpen && "hidden sm:block"
              )}
            >
              {phaseSummaries.map((p) => (
                <div
                  key={p.phase}
                  className="rounded-lg border border-slate-700/70 bg-slate-950/95 backdrop-blur px-2.5 py-2 shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-200">
                      {p.phase}. {p.name.replace(/^Phase\s+\d+\s*/i, "") || `Phase ${p.phase}`}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                      {p.completed}/{p.total} · {p.percentage}%
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-800"
                    role="progressbar"
                    aria-valuenow={p.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${p.name} progress: ${p.completed} of ${p.total} nodes complete`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                  <div className="mt-1 truncate text-[10px] text-slate-500" title={p.subtitle}>
                    {p.subtitle}
                    {p.hoursRemaining > 0 ? ` · ${p.hoursRemaining}h left` : " · done"}
                  </div>
                </div>
              ))}
              {/* Critical path toggle */}
              <button
                onClick={() => setShowCritical((v) => !v)}
                aria-pressed={showCritical}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[36px] rounded-lg border text-[11px] font-semibold transition-colors shadow-lg",
                  showCritical
                    ? "bg-amber-950/70 border-amber-800/70 text-amber-200"
                    : "bg-slate-950/95 border-slate-700 text-slate-400 hover:text-slate-200"
                )}
              >
                <Route size={12} aria-hidden />
                Critical path {showCritical ? "on" : "off"}
              </button>
            </div>
          </div>
        </Panel>

        <Panel position="top-right">
          <FitViewButton />
        </Panel>

        {/* ── Timeline (bottom center) ── */}
        <Panel position="bottom-center">
          <nav
            aria-label="Roadmap timeline"
            className="w-[calc(100vw-2rem)] max-w-2xl rounded-xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-md shadow-xl px-3 py-2 flex items-center gap-1 overflow-x-auto text-[11px]"
          >
            <TimelineChip
              icon={<MapPin size={11} aria-hidden />}
              label="Current"
              title={timeline.current.title}
              detail={timeline.current.detail}
              highlight
            />
            <ChevronRight size={12} className="text-slate-600 shrink-0" aria-hidden />
            <TimelineChip
              label="Next milestone"
              title={timeline.nextMilestone.title}
              detail={timeline.nextMilestone.detail}
            />
            <ChevronRight size={12} className="text-slate-600 shrink-0" aria-hidden />
            <TimelineChip
              label="Next phase"
              title={timeline.nextPhase.title}
              detail={timeline.nextPhase.detail}
            />
            <ChevronRight size={12} className="text-slate-600 shrink-0" aria-hidden />
            <TimelineChip
              label="Final target"
              title={timeline.finalTarget.title}
              detail={timeline.finalTarget.detail}
            />
          </nav>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function TimelineChip({
  icon,
  label,
  title,
  detail,
  highlight = false,
}: {
  icon?: React.ReactNode;
  label: string;
  title: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 basis-0" title={detail ? `${title} — ${detail}` : title}>
      <div
        className={cn(
          "text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
          highlight ? "text-cyan-300" : "text-slate-500"
        )}
      >
        {icon}
        {label}
      </div>
      <div className="truncate text-[11px] font-semibold text-slate-200">{title}</div>
      {detail && <div className="truncate text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}
