import { Cpu, DatabaseZap, Network, PlayCircle, Route, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TopicInteractiveDemo, TopicInteractiveDemoKind, TopicInteractiveMetric } from '../../shared/types';

interface Props {
  demo: TopicInteractiveDemo;
}

const metricLabels: Record<TopicInteractiveMetric, string> = {
  TTFT: 'TTFT',
  TPOT: 'TPOT',
  throughput: '吞吐',
  kvMemory: 'KV 显存',
  bandwidth: '带宽'
};

const kindLabels: Record<TopicInteractiveDemoKind, string> = {
  stack_compare: '栈全景',
  kv_paged_attention: 'KV + 分页',
  batching_prefill: '调度',
  ascend_operator: 'Ascend C',
  distributed_inference: '分布式推理'
};

export default function InteractiveLesson({ demo }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [intensity, setIntensity] = useState(62);
  const currentStep = demo.steps[Math.min(activeStep, demo.steps.length - 1)];
  const metricValues = useMemo(
    () => buildMetrics(demo.kind, demo.metrics, activeStep, intensity),
    [activeStep, demo.kind, demo.metrics, intensity]
  );

  return (
    <section className="interactive-lesson" aria-label={`${demo.title} 交互教学`}>
      <div className="interactive-head">
        <div>
          <span>{kindLabels[demo.kind]}</span>
          <h4>{demo.title}</h4>
          <p>{demo.summary}</p>
        </div>
        <div className="interactive-control" aria-label="演示强度">
          <SlidersHorizontal aria-hidden="true" size={16} />
          <label htmlFor={`interactive-${demo.kind}`}>负载</label>
          <input
            id={`interactive-${demo.kind}`}
            max={100}
            min={20}
            onChange={(event) => setIntensity(Number(event.target.value))}
            type="range"
            value={intensity}
          />
          <strong>{intensity}%</strong>
        </div>
      </div>

      <div className="interactive-stage">
        <DemoVisual kind={demo.kind} activeStep={activeStep} intensity={intensity} />
        <div className="interactive-side">
          <div className="metric-grid">
            {metricValues.map((metric) => (
              <div key={metric.key}>
                <span>{metricLabels[metric.key]}</span>
                <strong>{metric.value}</strong>
                <small>{metric.hint}</small>
              </div>
            ))}
          </div>
          <div className="interactive-explainer">
            <strong>{currentStep?.label ?? '观察变化'}</strong>
            <p>{currentStep?.explanation ?? '拖动负载或切换步骤，观察指标如何变化。'}</p>
          </div>
        </div>
      </div>

      <div className="interactive-steps" role="tablist" aria-label="教学步骤">
        {demo.steps.map((step, index) => (
          <button
            aria-selected={activeStep === index}
            className={activeStep === index ? 'active' : ''}
            key={step.id}
            onClick={() => setActiveStep(index)}
            role="tab"
            type="button"
          >
            <PlayCircle aria-hidden="true" size={15} />
            <span>{step.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function DemoVisual({
  kind,
  activeStep,
  intensity
}: {
  kind: TopicInteractiveDemoKind;
  activeStep: number;
  intensity: number;
}) {
  if (kind === 'stack_compare') {
    return <StackCompareVisual activeStep={activeStep} />;
  }
  if (kind === 'kv_paged_attention') {
    return <KvPagedVisual activeStep={activeStep} intensity={intensity} />;
  }
  if (kind === 'batching_prefill') {
    return <BatchingVisual activeStep={activeStep} intensity={intensity} />;
  }
  if (kind === 'ascend_operator') {
    return <AscendOperatorVisual activeStep={activeStep} intensity={intensity} />;
  }
  return <DistributedInferenceVisual activeStep={activeStep} intensity={intensity} />;
}

function StackCompareVisual({ activeStep }: { activeStep: number }) {
  const left = ['Triton', 'TensorRT-LLM', 'CUDA Runtime', 'NCCL', 'NVIDIA GPU'];
  const right = ['MindIE-Service / vLLM-Ascend', 'MindIE-LLM / RT', 'AscendCL (CANN)', 'HCCL', 'Ascend NPU'];
  return (
    <div className="demo-visual stack-visual">
      <StackColumn title="NVIDIA" items={left} activeIndex={activeStep} />
      <div className="stack-bridge">
        <Route aria-hidden="true" size={28} />
        <span>同一类问题，不同工程入口</span>
      </div>
      <StackColumn title="昇腾" items={right} activeIndex={activeStep} />
    </div>
  );
}

function StackColumn({ title, items, activeIndex }: { title: string; items: string[]; activeIndex: number }) {
  return (
    <div className="stack-column">
      <strong>{title}</strong>
      {items.map((item, index) => (
        <span className={index === activeIndex % items.length ? 'active' : ''} key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function KvPagedVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const blocks = Array.from({ length: 16 }, (_, index) => index);
  const usedBlocks = Math.min(16, Math.round((intensity / 100) * 13) + activeStep);
  return (
    <div className="demo-visual kv-visual">
      <div className="token-lane">
        {['system', 'user', 'doc', 'answer'].map((token, index) => (
          <span className={index <= activeStep ? 'active' : ''} key={token}>
            {token}
          </span>
        ))}
      </div>
      <div className="cache-wall" aria-label="KV cache blocks">
        {blocks.map((block) => (
          <span className={block < usedBlocks ? (block % 4 === 0 ? 'shared' : 'used') : ''} key={block} />
        ))}
      </div>
      <div className="kv-caption">
        <DatabaseZap aria-hidden="true" size={18} />
        <span>{activeStep > 1 ? '分页 block 复用前缀，减少碎片' : '每个新 token 追加 K/V 卡片'}</span>
      </div>
    </div>
  );
}

function BatchingVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const lanes = ['A', 'B', 'C', 'D'];
  return (
    <div className="demo-visual batching-visual">
      {lanes.map((lane, laneIndex) => (
        <div className="request-lane" key={lane}>
          <strong>Req {lane}</strong>
          {Array.from({ length: 6 }, (_, index) => {
            const isPrefill = index < 2 + (laneIndex % 2);
            const active = index * 14 + laneIndex * 6 < intensity + activeStep * 10;
            return (
              <span className={`${active ? 'active' : ''} ${isPrefill ? 'prefill' : 'decode'}`} key={index}>
                {isPrefill ? 'P' : 'D'}
              </span>
            );
          })}
        </div>
      ))}
      <div className="scheduler-strip">
        <span>GPU step</span>
        <strong>{activeStep >= 2 ? 'prefill 分块穿插 decode' : '请求动态补入 batch'}</strong>
      </div>
    </div>
  );
}

function AscendOperatorVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const tiles = Math.max(3, Math.round(intensity / 18));
  return (
    <div className="demo-visual ascend-visual">
      {['CopyIn', 'Compute', 'CopyOut'].map((stage, stageIndex) => (
        <div className="pipeline-column" key={stage}>
          <strong>{stage}</strong>
          {Array.from({ length: tiles }, (_, index) => (
            <span className={index + stageIndex <= activeStep + 3 ? 'active' : ''} key={index}>
              tile {index + 1}
            </span>
          ))}
        </div>
      ))}
      <div className="ai-core-chip">
        <Cpu aria-hidden="true" size={22} />
        <span>{'AI Core: GM→UB→Vector ｜ GM→L1→L0→Cube'}</span>
      </div>
    </div>
  );
}

function DistributedInferenceVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const transfer = Math.min(92, 28 + activeStep * 16 + intensity / 4);
  return (
    <div className="demo-visual distributed-visual">
      <div className="worker-node prefill-node">
        <strong>Prefill Pool</strong>
        <span>构建 KV</span>
      </div>
      <div className="transfer-lane">
        <Network aria-hidden="true" size={22} />
        <div>
          <span style={{ width: `${transfer}%` }} />
        </div>
        <small>
          {activeStep >= 3
            ? 'KV-aware routing：选 worker'
            : activeStep === 2
              ? 'KV transfer：NIXL (NVIDIA) ｜ HCCL/Mooncake (昇腾)'
              : 'KV transfer'}
        </small>
      </div>
      <div className="worker-node decode-node">
        <strong>Decode Pool</strong>
        <span>逐 token 输出</span>
      </div>
    </div>
  );
}

function buildMetrics(
  kind: TopicInteractiveDemoKind,
  metrics: TopicInteractiveMetric[],
  activeStep: number,
  intensity: number
) {
  const load = intensity / 100;
  return metrics.map((key) => {
    if (key === 'TTFT') {
      const base = kind === 'batching_prefill' ? 980 : kind === 'distributed_inference' ? 760 : 620;
      return { key, value: `${Math.round(base * (1.2 - activeStep * 0.12) * load)} ms`, hint: '首 token 等待' };
    }
    if (key === 'TPOT') {
      const base = kind === 'distributed_inference' ? 38 : 52;
      return { key, value: `${Math.max(12, Math.round(base * (1.15 - activeStep * 0.09) * load))} ms`, hint: '后续 token 间隔' };
    }
    if (key === 'throughput') {
      return { key, value: `${Math.round((150 + activeStep * 38) * load)} tok/s`, hint: '吞吐随调度提升' };
    }
    if (key === 'kvMemory') {
      return { key, value: `${Math.round((18 + load * 44) * (kind === 'kv_paged_attention' ? 0.82 : 1))} GB`, hint: 'KV block 占用' };
    }
    return { key, value: `${Math.round(120 + activeStep * 35 + intensity * 1.4)} GB/s`, hint: '跨池或跨卡数据流' };
  });
}
