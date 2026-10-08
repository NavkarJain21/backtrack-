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
import { useCallback, useEffect, useMemo } from "react";
import { RoadmapFlowNode, type RoadmapNodeData } from "./RoadmapFlowNode";
import type { Roadmap, RoadmapNode } from "@/lib/schemas";
import { getPhaseColor, getPhaseBorderColor } from "@/lib/utils";
import { Layers } from "lucide-react";

const nodeTypes = {
  roadmapNode: RoadmapFlowNode,
};

interface RoadmapCanvasProps {
  roadmap: Roadmap;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
}

/** Layout nodes into phase lanes (horizontal columns) */
function layoutNodes(
  nodes: RoadmapNode[],
  selectedNodeId: string | null,
  onNodeClick: (id: string) => void
): Node[] {
  // Group by phase
  const phases = new Map<number, RoadmapNode[]>();
  for (const node of nodes) {
    const p = phases.get(node.phase) ?? [];
    p.push(node);
    phases.set(node.phase, p);
  }

  const PHASE_WIDTH = 320;
  const NODE_HEIGHT = 180;
  const NODE_GAP = 24;
  const PHASE_PADDING_TOP = 80;

  const result: Node[] = [];
  const sortedPhases = [...phases.keys()].sort((a, b) => a - b);

  for (const phase of sortedPhases) {
    const phaseNodes = phases.get(phase)!;
    const x = (phase - 1) * PHASE_WIDTH;

    phaseNodes.forEach((node, i) => {
      const y = PHASE_PADDING_TOP + i * (NODE_HEIGHT + NODE_GAP);
      result.push({
        id: node.id,
        type: "roadmapNode",
        position: { x, y },
        data: {
          ...node,
          onClick: onNodeClick,
          isSelected: node.id === selectedNodeId,
        } as RoadmapNodeData,
        selectable: node.status !== "locked",
      });
    });
  }

  return result;
}

/** Build edges from dependency list */
function buildEdges(nodes: RoadmapNode[]): Edge[] {
  const edges: Edge[] = [];
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      edges.push({
        id: `${dep}-${node.id}`,
        source: dep,
        target: node.id,
        type: "smoothstep",
        animated: node.status === "in_progress",
        style: {
          stroke:
            node.status === "locked"
              ? "#374151"
              : node.status === "known"
              ? "#7c3aed"
              : node.status === "completed"
              ? "#059669"
              : node.status === "in_progress"
              ? "#d97706"
              : "#3b82f6",
          strokeWidth: 2,
          strokeDasharray: node.status === "locked" ? "4 4" : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color:
            node.status === "locked"
              ? "#374151"
              : node.status === "known"
              ? "#7c3aed"
              : "#3b82f6",
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
      onClick={() => fitView({ padding: 0.15, duration: 500 })}
      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-gray-300 transition-colors"
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
  const flowNodes = useMemo(
    () => layoutNodes(roadmap.nodes, selectedNodeId, onNodeClick),
    [roadmap.nodes, selectedNodeId, onNodeClick]
  );
  const flowEdges = useMemo(() => buildEdges(roadmap.nodes), [roadmap.nodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Phase labels data
  const phases = useMemo(() => {
    const map = new Map<number, string>();
    for (const node of roadmap.nodes) {
      if (!map.has(node.phase)) {
        map.set(node.phase, `Phase ${node.phase}`);
      }
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [roadmap.nodes]);

  return (
    <div className="w-full h-full relative">
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
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1e293b" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as RoadmapNodeData;
            switch (d.status) {
              case "completed": return "#059669";
              case "known": return "#7c3aed";
              case "in_progress": return "#d97706";
              case "available": return "#3b82f6";
              default: return "#374151";
            }
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
          }}
        />

        {/* Phase labels panel */}
        <Panel position="top-left">
          <div className="flex gap-2 flex-wrap max-w-lg">
            {phases.map(([phase]) => (
              <div
                key={phase}
                className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getPhaseColor(phase)} border ${getPhaseBorderColor(phase)} text-xs font-medium text-gray-200 opacity-80 flex items-center gap-1.5`}
              >
                <Layers size={10} />
                Phase {phase}
              </div>
            ))}
          </div>
        </Panel>

        <Panel position="top-right">
          <FitViewButton />
        </Panel>
      </ReactFlow>
    </div>
  );
}
