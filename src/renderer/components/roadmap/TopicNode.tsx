import { Handle, Position, type NodeProps } from '@xyflow/react';

interface TopicNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  status: string;
  difficulty: number;
  isMainTrack: boolean;
}

export default function TopicNode({ data }: NodeProps) {
  const d = data as TopicNodeData;
  const stars = '★'.repeat(d.difficulty) + '☆'.repeat(Math.max(0, 3 - d.difficulty));
  const className = ['topic-node', `status-${d.status}`, d.isMainTrack ? 'main-track' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} title={`${d.id} · ${d.label}`}>
      <Handle type="target" position={Position.Left} />
      <div className="topic-node-row">
        <span className="topic-node-id">{d.id}</span>
        <span className="topic-node-stars" aria-label={`难度 ${d.difficulty}/3`}>
          {stars}
        </span>
      </div>
      <div className="topic-node-name">{d.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
