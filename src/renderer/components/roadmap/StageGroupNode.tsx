import type { NodeProps } from '@xyflow/react';

interface StageGroupData extends Record<string, unknown> {
  id: string;
  name: string;
}

export default function StageGroupNode({ data }: NodeProps) {
  const d = data as StageGroupData;
  return (
    <div className="stage-group">
      <span className="stage-group-id">{d.id}</span>
      <strong className="stage-group-name">{d.name}</strong>
    </div>
  );
}
