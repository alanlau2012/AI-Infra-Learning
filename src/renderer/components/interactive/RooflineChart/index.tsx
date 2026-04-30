import { useCallback, useEffect, useState } from 'react';
import type { TopicGate } from '../../../../shared/types';
import ExplorePanel from './ExplorePanel';
import GatePanel from './GatePanel';

interface Props {
  topicId: string;
  mode: 'explore' | 'gate';
  /** Optional callback fired when gate finalizes successfully. Parent can use
   * this to refresh outline / progress / topic detail. */
  onGateCompleted?: () => void;
}

export default function RooflineChart({ topicId, mode, onGateCompleted }: Props) {
  const [gate, setGate] = useState<TopicGate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGate = useCallback(async () => {
    setError(null);
    try {
      const next = await window.learning.getTopicGate(topicId);
      setGate(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [topicId]);

  useEffect(() => {
    void loadGate();
  }, [loadGate]);

  if (error) {
    return <div className="roofline-error">无法加载 Roofline 数据：{error}</div>;
  }
  if (!gate) {
    return <div className="roofline-loading">正在加载 Roofline 数据…</div>;
  }

  if (mode === 'explore') {
    return (
      <ExplorePanel hardwarePresets={gate.hardwarePresets} scenarios={gate.exploreScenarios} />
    );
  }

  return (
    <GatePanel
      topicId={topicId}
      gate={gate}
      onCompleted={() => onGateCompleted?.()}
      onReload={loadGate}
    />
  );
}
