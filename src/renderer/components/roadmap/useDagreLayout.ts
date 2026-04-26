import dagre from 'dagre';
import { useMemo } from 'react';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const STAGE_PADDING = 24;

export interface LayoutInput {
  nodes: Array<{
    id: string;
    stageId: string;
    label: string;
    status: string;
    difficulty: number;
    isMainTrack: boolean;
  }>;
  edges: Array<{ id: string; source: string; target: string; isMainTrack: boolean }>;
  stages: Array<{ id: string; name: string }>;
}

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export function useDagreLayout(input: LayoutInput): LayoutResult {
  return useMemo(() => layout(input), [input]);
}

function layout({ nodes, edges, stages }: LayoutInput): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Group topic nodes by stage to compute group bounding boxes.
  type Box = { minX: number; minY: number; maxX: number; maxY: number };
  const stageBoxes = new Map<string, Box>();
  const positionedNodes: Node[] = [];

  for (const node of nodes) {
    const pos = g.node(node.id);
    if (!pos) {
      continue;
    }
    const x = pos.x - NODE_WIDTH / 2;
    const y = pos.y - NODE_HEIGHT / 2;

    const box = stageBoxes.get(node.stageId);
    if (!box) {
      stageBoxes.set(node.stageId, {
        minX: x,
        minY: y,
        maxX: x + NODE_WIDTH,
        maxY: y + NODE_HEIGHT
      });
    } else {
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x + NODE_WIDTH);
      box.maxY = Math.max(box.maxY, y + NODE_HEIGHT);
    }

    positionedNodes.push({
      id: node.id,
      type: 'topic',
      position: { x, y },
      data: {
        id: node.id,
        label: node.label,
        status: node.status,
        difficulty: node.difficulty,
        isMainTrack: node.isMainTrack
      },
      draggable: false
    });
  }

  // Stage group nodes: rendered behind topic nodes. React Flow render order = node order.
  const groupNodes: Node[] = stages
    .filter((stage) => stageBoxes.has(stage.id))
    .map((stage) => {
      const box = stageBoxes.get(stage.id)!;
      return {
        id: `group-${stage.id}`,
        type: 'stageGroup',
        position: { x: box.minX - STAGE_PADDING, y: box.minY - STAGE_PADDING - 20 },
        data: { id: stage.id, name: stage.name },
        style: {
          width: box.maxX - box.minX + STAGE_PADDING * 2,
          height: box.maxY - box.minY + STAGE_PADDING * 2 + 20
        },
        selectable: false,
        draggable: false,
        zIndex: -1
      };
    });

  const finalNodes: Node[] = [...groupNodes, ...positionedNodes];

  const finalEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.isMainTrack,
    className: edge.isMainTrack ? 'main-track' : undefined
  }));

  return { nodes: finalNodes, edges: finalEdges };
}
