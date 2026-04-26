import { Background, Controls, MiniMap, ReactFlow, type NodeMouseHandler } from '@xyflow/react';
import { useMemo } from 'react';
import type { RoadmapGraph, StageWithTopics } from '../../../shared/types';
import StageGroupNode from './StageGroupNode';
import TopicNode from './TopicNode';
import { useDagreLayout, type LayoutInput } from './useDagreLayout';
import '@xyflow/react/dist/style.css';
import './roadmap.css';

const nodeTypes = {
  topic: TopicNode,
  stageGroup: StageGroupNode
};

interface Props {
  outline: StageWithTopics[];
  graph: RoadmapGraph;
  onSelectTopic: (topicId: string) => void;
}

export default function RoadmapView({ outline, graph, onSelectTopic }: Props) {
  const layoutInput = useMemo<LayoutInput>(() => buildLayoutInput(outline, graph), [outline, graph]);
  const { nodes, edges } = useDagreLayout(layoutInput);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.type === 'topic') {
      onSelectTopic(node.id);
    }
  };

  return (
    <div className="roadmap-root" data-testid="roadmap-root">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

function buildLayoutInput(outline: StageWithTopics[], graph: RoadmapGraph): LayoutInput {
  const mainTrackSet = new Set(graph.mainTrack);
  const mainTrackEdgeKeys = new Set<string>();
  for (let i = 0; i < graph.mainTrack.length - 1; i += 1) {
    mainTrackEdgeKeys.add(`${graph.mainTrack[i]}->${graph.mainTrack[i + 1]}`);
  }

  const nodes = outline.flatMap((stage) =>
    stage.topics.map((topic) => ({
      id: topic.id,
      stageId: stage.id,
      label: topic.name,
      status: topic.status,
      difficulty: topic.difficulty,
      isMainTrack: mainTrackSet.has(topic.id)
    }))
  );

  const edges = graph.edges.map((edge) => ({
    id: `${edge.from}->${edge.to}`,
    source: edge.from,
    target: edge.to,
    isMainTrack: mainTrackEdgeKeys.has(`${edge.from}->${edge.to}`)
  }));

  const stages = outline.map((stage) => ({ id: stage.id, name: stage.name }));

  return { nodes, edges, stages };
}
