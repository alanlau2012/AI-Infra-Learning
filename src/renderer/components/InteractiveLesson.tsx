import { Cpu, DatabaseZap, Network, Pause, Play, PlayCircle, Route, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setActiveStep(0);
    setPlaying(false);
  }, [demo.title]);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const id = setInterval(() => {
      setActiveStep((step) => (step + 1) % demo.steps.length);
    }, 2200);
    return () => clearInterval(id);
  }, [playing, demo.steps.length]);

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
        <div className="interactive-control" aria-label="演示控制">
          <button
            aria-pressed={playing}
            className={`play-toggle ${playing ? 'on' : ''}`}
            onClick={() => setPlaying((value) => !value)}
            type="button"
          >
            {playing ? <Pause aria-hidden="true" size={15} /> : <Play aria-hidden="true" size={15} />}
            <span>{playing ? '暂停演示' : '自动演示'}</span>
          </button>
          <div className="load-control">
            <SlidersHorizontal aria-hidden="true" size={15} />
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
      </div>

      <div className="interactive-stage">
        <DemoVisual activeStep={activeStep} intensity={intensity} kind={demo.kind} onSelect={setActiveStep} />
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

      <div aria-label="教学步骤" className="interactive-steps" role="tablist">
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

interface VisualProps {
  kind: TopicInteractiveDemoKind;
  activeStep: number;
  intensity: number;
  onSelect: (index: number) => void;
}

function DemoVisual({ kind, activeStep, intensity, onSelect }: VisualProps) {
  if (kind === 'stack_compare') {
    return <StackCompareVisual activeStep={activeStep} onSelect={onSelect} />;
  }
  if (kind === 'kv_paged_attention') {
    return <KvPagedVisual activeStep={activeStep} intensity={intensity} />;
  }
  if (kind === 'batching_prefill') {
    return <BatchingVisual activeStep={activeStep} />;
  }
  if (kind === 'ascend_operator') {
    return <AscendOperatorVisual activeStep={activeStep} intensity={intensity} />;
  }
  return <DistributedInferenceVisual activeStep={activeStep} intensity={intensity} />;
}

function StackCompareVisual({ activeStep, onSelect }: { activeStep: number; onSelect: (index: number) => void }) {
  const left = ['Triton', 'TensorRT-LLM', 'CUDA Runtime', 'NCCL', 'NVIDIA GPU'];
  const right = ['MindIE-Service / vLLM-Ascend', 'MindIE-LLM / RT', 'AscendCL (CANN)', 'HCCL', 'Ascend NPU'];
  const layers = ['服务入口', '推理引擎', '运行时', '通信', '硬件'];
  const idx = activeStep % left.length;
  return (
    <div className="demo-visual stack-visual">
      <StackColumn activeIndex={idx} items={left} onSelect={onSelect} title="NVIDIA" />
      <div className="stack-bridge">
        <Route aria-hidden="true" size={26} />
        <span className="bridge-line" aria-hidden="true" key={idx} />
        <strong>{layers[idx]}</strong>
        <span>同一层 · 两种工程入口</span>
      </div>
      <StackColumn activeIndex={idx} items={right} onSelect={onSelect} title="昇腾" />
    </div>
  );
}

function StackColumn({
  title,
  items,
  activeIndex,
  onSelect
}: {
  title: string;
  items: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="stack-column">
      <strong>{title}</strong>
      {items.map((item, index) => (
        <button
          className={`stack-layer ${index === activeIndex ? 'active' : ''}`}
          key={item}
          onClick={() => onSelect(index)}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function KvPagedVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const total = 24;
  const tokens = ['system', 'user', 'doc', 'answer'];
  const used = Math.min(total, Math.round((intensity / 100) * 14) + activeStep * 2 + 4);
  const captions = [
    '无缓存：每个 token 都重算历史 K/V',
    '追加 K/V：新 token 只写自己的卡片',
    '分页 block：非连续分配，碎片减少',
    '共享前缀：多请求复用 prefix block'
  ];
  return (
    <div className="demo-visual kv-visual">
      <div className="token-lane">
        {tokens.map((token, index) => (
          <span className={index <= activeStep ? 'active' : ''} key={token}>
            {token}
          </span>
        ))}
      </div>
      <div aria-label="KV cache blocks" className="cache-wall">
        {Array.from({ length: total }, (_, block) => {
          const isUsed = block < used;
          const isShared = isUsed && block < 4 && activeStep >= 3;
          const isHead = block === used - 1 && activeStep >= 1;
          const tone = isShared ? 'shared' : isUsed ? 'used' : '';
          return (
            <span
              className={`${tone} ${isUsed ? 'flow' : ''} ${isHead ? 'writing' : ''}`.trim()}
              key={block}
              style={{ animationDelay: `${(block % 8) * 0.11}s` }}
            />
          );
        })}
      </div>
      <div className="kv-caption">
        <DatabaseZap aria-hidden="true" size={18} />
        <span>{captions[Math.min(activeStep, captions.length - 1)]}</span>
      </div>
    </div>
  );
}

export function batchPattern(step: number): { prefill: number[]; stalled: number[] } {
  if (step <= 0) {
    return { prefill: [3, 4, 5, 6, 7, 8], stalled: [3, 4, 5, 6, 7, 8] };
  }
  if (step === 1) {
    return { prefill: [3, 4, 5, 6, 7, 8], stalled: [] };
  }
  if (step === 2) {
    return { prefill: [3, 5, 7, 9], stalled: [] };
  }
  return { prefill: [3, 4, 6, 7, 9, 10], stalled: [] };
}

function BatchingVisual({ activeStep }: { activeStep: number }) {
  const cols = 12;
  const rows = ['R1', 'R2', 'R3', 'R4'];
  const pattern = batchPattern(activeStep);
  const labels = [
    '静态 batch：长 prompt 冻结全场',
    '连续补位：每步动态补入请求',
    'Prefill 分块：与 decode 交错',
    '延迟平衡：chunk 粒度权衡'
  ];
  return (
    <div className="demo-visual batching-visual">
      <div className="batch-grid">
        <span aria-hidden="true" className="scan-line" />
        {rows.map((row) => (
          <div className="batch-row" key={row}>
            <em>{row}</em>
            {Array.from({ length: cols }, (_, col) => {
              const stalled = pattern.stalled.includes(col);
              const tone = stalled ? 'stalled' : col <= 10 ? 'decode on' : '';
              return (
                <span
                  className={`batch-cell ${tone}`.trim()}
                  key={col}
                  style={{ animationDelay: `${col * 0.05}s` }}
                />
              );
            })}
          </div>
        ))}
        <div className="batch-row prefill-row">
          <em>R5</em>
          {Array.from({ length: cols }, (_, col) => {
            const isPrefill = pattern.prefill.includes(col);
            return (
              <span
                className={`batch-cell ${isPrefill ? 'prefill on' : ''}`.trim()}
                key={col}
                style={{ animationDelay: `${col * 0.05}s` }}
              />
            );
          })}
        </div>
      </div>
      <div className="scheduler-strip">
        <span>GPU step</span>
        <strong>{labels[Math.min(activeStep, labels.length - 1)]}</strong>
      </div>
    </div>
  );
}

function AscendOperatorVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const tileCount = Math.max(3, Math.min(6, Math.round(intensity / 18)));
  const duration = Math.max(3.4, 6 - intensity / 45);
  const zones = ['CopyIn', 'Compute', 'CopyOut'];
  const activeZone = activeStep <= 0 ? 0 : Math.min(activeStep - 1, zones.length - 1);
  return (
    <div className="demo-visual ascend-visual">
      <div className="pipeline-track">
        {zones.map((zone, index) => (
          <div className={`zone ${index === activeZone ? 'active' : ''}`} key={zone}>
            <span>{zone}</span>
          </div>
        ))}
        <div aria-hidden="true" className="tile-flow-layer">
          {Array.from({ length: tileCount }, (_, index) => (
            <span
              className="flow-tile"
              key={index}
              style={{
                animationDelay: `${(index * duration) / tileCount}s`,
                animationDuration: `${duration}s`
              }}
            >
              tile {index + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="ai-core-chip">
        <Cpu aria-hidden="true" size={20} />
        <span>{'AI Core: GM→UB→Vector ｜ GM→L1→L0→Cube'}</span>
      </div>
    </div>
  );
}

function DistributedInferenceVisual({ activeStep, intensity }: { activeStep: number; intensity: number }) {
  const transfer = Math.min(96, 30 + activeStep * 16 + intensity / 5);
  const routing = activeStep >= 3;
  const labels = [
    '单池混跑：prefill 干扰 decode',
    'P/D 分离：两池各自优化',
    'KV transfer：NIXL (NVIDIA) ｜ HCCL/Mooncake (昇腾)',
    'KV-aware routing：按命中选 worker'
  ];
  return (
    <div className="demo-visual distributed-visual">
      <div className="worker-node prefill-node">
        <strong>Prefill Pool</strong>
        <span>构建 KV</span>
      </div>
      <div className="transfer-lane">
        <Network aria-hidden="true" size={20} />
        <div className="transfer-track">
          <span className="fill" style={{ width: `${transfer}%` }} />
          {activeStep >= 1 ? (
            <>
              <i className="packet" />
              <i className="packet p2" />
              <i className="packet p3" />
            </>
          ) : null}
        </div>
        <small>{labels[Math.min(activeStep, labels.length - 1)]}</small>
      </div>
      <div className={`worker-node decode-node ${routing ? 'routing' : ''}`}>
        <strong>Decode Pool</strong>
        <span>{routing ? '按缓存命中选 worker' : '逐 token 输出'}</span>
      </div>
    </div>
  );
}

// 按 kind 分发到具体的定性响应函数。签名保持稳定（test/interactiveLesson.test.tsx 与
// test/buildMetrics.test.ts 均依赖）。数值为示意、非 benchmark，但对每个机制保持
// 定性正确：指标随 step / intensity 的变化方向必须符合真实机制直觉。
function metricForKind(
  kind: TopicInteractiveDemoKind,
  key: TopicInteractiveMetric,
  step: number,
  load: number
): { value: string; hint: string } {
  switch (kind) {
    case 'stack_compare':
      return stackCompareMetric(key, step, load);
    case 'kv_paged_attention':
      return kvPagedMetric(key, step, load);
    case 'batching_prefill':
      return batchingMetric(key, step, load);
    case 'ascend_operator':
      return ascendMetric(key, step, load);
    case 'distributed_inference':
      return distributedMetric(key, step, load);
  }
}

// T01 栈全景：对照性 demo，不表征实时性能，指标象征性温和波动。
function stackCompareMetric(key: TopicInteractiveMetric, step: number, load: number) {
  if (key === 'throughput') {
    return {
      value: `${Math.round((120 + step * 8) * (0.8 + load * 0.4))} tok/s`,
      hint: '示意：服务层综合吞吐'
    };
  }
  return {
    value: `${Math.round(180 + step * 12 + load * 60)} GB/s`,
    hint: '示意：跨层互联带宽'
  };
}

// T02 KV Cache / PagedAttention：step 0 无缓存 / 1 追加 K-V / 2 分页 / 3 共享前缀。
function kvPagedMetric(key: TopicInteractiveMetric, step: number, load: number) {
  if (key === 'kvMemory') {
    // token 累积使 KV 增长；分页(step2)/共享前缀(step3)压低碎片增长。
    const growth = step <= 1 ? 1 : step === 2 ? 0.78 : 0.62;
    const gb = Math.round((14 + load * 46) * (0.5 + step * 0.18) * growth + 6);
    return {
      value: `${gb} GB`,
      hint: step >= 2 ? '分页/共享前缀压低碎片增长' : '随 token 累积增长'
    };
  }
  if (key === 'throughput') {
    // KV 越满（load 高）吞吐越受压；分页/共享(step>=2)回收容量、回升吞吐。
    const relief = step >= 2 ? 1.25 : 1;
    const tps = Math.round((90 + step * 22) * (1.3 - load * 0.6) * relief);
    return {
      value: `${Math.max(20, tps)} tok/s`,
      hint: load > 0.8 ? 'KV 接近满，吞吐受压' : '容量回收后吞吐回升'
    };
  }
  // TPOT：KV 越大越长，分页(step>=2)优化后改善。
  const tpot = Math.max(14, Math.round((60 - step * 6) * (0.9 + load * 0.4)));
  return { value: `${tpot} ms`, hint: '后续 token 间隔（分页优化后改善）' };
}

// T03 Continuous Batching / Chunked Prefill：step 0 静态 / 1 连续补位 / 2 chunked prefill / 3 延迟平衡。
function batchingMetric(key: TopicInteractiveMetric, step: number, load: number) {
  if (key === 'throughput') {
    return {
      value: `${Math.round((140 + step * 46) * (0.7 + load * 0.5))} tok/s`,
      hint: '连续 batching + 切片调度提吞吐'
    };
  }
  if (key === 'TTFT') {
    // chunked prefill(step2)切分 prefill 使 TTFT 略升（反直觉）；延迟平衡(step3)回落。
    const chunkPenalty = step === 2 ? 1.18 : step === 3 ? 1.05 : 1;
    const ttft = Math.round(540 * (0.85 + load * 0.5) * chunkPenalty);
    return {
      value: `${ttft} ms`,
      hint: step === 2 ? 'chunked prefill 切分 prefill，TTFT 略升' : '首 token 等待'
    };
  }
  // TPOT：调度改善 decode 尾延迟。
  const tpot = Math.max(12, Math.round((58 - step * 7) * (0.9 + load * 0.35)));
  return { value: `${tpot} ms`, hint: 'decode 尾延迟随调度改善' };
}

// T04 Ascend C 算子流水：CopyIn → Compute → CopyOut。
function ascendMetric(key: TopicInteractiveMetric, step: number, load: number) {
  if (key === 'throughput') {
    // pipeline 三段重叠后吞吐提升并趋于饱和。
    const overlap = Math.min(1, 0.55 + step * 0.18);
    return {
      value: `${Math.round(220 * overlap * (0.7 + load * 0.5))} tok/s`,
      hint: 'pipeline 重叠后吞吐提升'
    };
  }
  const bw = Math.round((160 + step * 30) * (0.75 + load * 0.5));
  return { value: `${bw} GB/s`, hint: 'GM↔本地内存搬运是瓶颈' };
}

// T05 P/D 分离：step 0 单池混跑 / 1 P-D 分离 / 2 KV 传输 / 3 智能路由。
function distributedMetric(key: TopicInteractiveMetric, step: number, load: number) {
  if (key === 'TTFT') {
    const separate = step >= 1 ? 0.8 : 1.1;
    return {
      value: `${Math.round(680 * separate * (0.85 + load * 0.4))} ms`,
      hint: step >= 1 ? 'P/D 分离：prefill 专用，TTFT 改善' : '单池 prefill 干扰 decode'
    };
  }
  if (key === 'TPOT') {
    const separate = step >= 1 ? 0.82 : 1.08;
    return {
      value: `${Math.max(14, Math.round(46 * separate * (0.9 + load * 0.35)))} ms`,
      hint: step >= 1 ? 'decode 专用池，TPOT 改善' : 'prefill/decode 抢资源'
    };
  }
  if (key === 'throughput') {
    // P/D 分离(step>=1)的收益随并发(load)放大：低并发 transfer 吃收益、高并发才划算；
    // 智能路由(step3)再叠加缓存命中加成。
    const pdGain = step >= 1 ? 0.7 + load * 0.7 : 1;
    const routing = step >= 3 ? 1.25 : 1;
    return {
      value: `${Math.round((130 + step * 20) * (0.5 + load * 0.6) * pdGain * routing)} tok/s`,
      hint: step >= 3 ? 'KV-aware routing 提吞吐' : 'P/D 分离需高并发才划算'
    };
  }
  // bandwidth：P/D 分离(step>=1)新增 KV transfer 成本。
  const transfer = step >= 1 ? 1.5 : 1;
  return {
    value: `${Math.round((140 + step * 28) * (0.8 + load * 0.4) * transfer)} GB/s`,
    hint: step >= 1 ? 'KV transfer 是 P/D 分离的新成本' : '单池无跨池传输'
  };
}

export function buildMetrics(
  kind: TopicInteractiveDemoKind,
  metrics: TopicInteractiveMetric[],
  activeStep: number,
  intensity: number
) {
  const load = intensity / 100;
  return metrics.map((key) => {
    const result = metricForKind(kind, key, activeStep, load);
    return { key, value: result.value, hint: result.hint };
  });
}
