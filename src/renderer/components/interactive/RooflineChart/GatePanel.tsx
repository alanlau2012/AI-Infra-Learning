import { useMemo, useState } from 'react';
import type {
  BoundAnswer,
  GateAttemptResult,
  GateQuestion,
  HardwarePreset,
  SingleAnswerResult,
  TopicGate
} from '../../../../shared/types';
import ChartCanvas from './ChartCanvas';

type Phase =
  | { kind: 'idle' }
  | { kind: 'in_progress'; questions: GateQuestion[]; index: number; reveal: SingleAnswerResult | null; collected: Array<{ questionId: string; answer: BoundAnswer }> }
  | { kind: 'result'; result: GateAttemptResult };

interface Props {
  topicId: string;
  gate: TopicGate;
  onCompleted: () => void;
  onReload: () => Promise<void>;
}

export default function GatePanel({ topicId, gate, onCompleted, onReload }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => describeStatus(gate), [gate]);

  async function startAttempt() {
    setError(null);
    try {
      const questions = await window.learning.startGateAttempt(topicId);
      setPhase({ kind: 'in_progress', questions, index: 0, reveal: null, collected: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function submitAnswer(answer: BoundAnswer) {
    if (phase.kind !== 'in_progress' || phase.reveal) return;
    const current = phase.questions[phase.index];
    setError(null);
    try {
      const reveal = await window.learning.checkSingleAnswer(topicId, current.id, answer);
      setPhase({
        ...phase,
        reveal,
        collected: [...phase.collected, { questionId: current.id, answer }]
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function advance() {
    if (phase.kind !== 'in_progress' || !phase.reveal) return;
    const isLast = phase.index >= phase.questions.length - 1;
    if (!isLast) {
      setPhase({ ...phase, index: phase.index + 1, reveal: null });
      return;
    }
    setError(null);
    try {
      const result = await window.learning.finalizeAttempt(topicId, phase.collected);
      setPhase({ kind: 'result', result });
      // status & topicStatus may have changed in main; let parent reload.
      await onReload();
      if (result.passed) {
        onCompleted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function resetToIdle() {
    setPhase({ kind: 'idle' });
  }

  // ----- Render -----
  if (phase.kind === 'idle') {
    return (
      <div className="roofline-gate roofline-gate-idle">
        <div className="roofline-gate-summary">{summary}</div>
        <button type="button" className="roofline-gate-cta" onClick={() => void startAttempt()}>
          {gate.status === 'not_attempted' ? '开始检验' : '再次检验'}
        </button>
        <p className="roofline-gate-rule">
          5 题判断 compute / memory bound，答对 ≥ {gate.attemptConfig.passingThreshold} 自动标记为已完成。
        </p>
        {error ? <p className="roofline-gate-error">{error}</p> : null}
      </div>
    );
  }

  if (phase.kind === 'in_progress') {
    const current = phase.questions[phase.index];
    const hw = gate.hardwarePresets.find((h) => h.id === current.hardwareId) ?? gate.hardwarePresets[0];
    const reveal = phase.reveal;
    const point = reveal
      ? {
          ai: reveal.operatingPoint.ai,
          perfTflops: reveal.operatingPoint.perfTflops,
          bound: reveal.correctAnswer,
          label: `AI=${reveal.operatingPoint.ai}`
        }
      : null;
    return (
      <div className="roofline-gate roofline-gate-active">
        <div className="roofline-gate-progress">
          <span>
            第 {phase.index + 1} / {phase.questions.length} 题
          </span>
          <div className="roofline-gate-progress-bar" aria-hidden="true">
            <span style={{ width: `${((phase.index + (reveal ? 1 : 0)) / phase.questions.length) * 100}%` }} />
          </div>
        </div>

        <div className="roofline-gate-question">
          <h4>{current.name}</h4>
          <p>
            硬件：<strong>{hw.name}</strong>（{hw.peakTflops} TFLOPS / {hw.bandwidthTBs} TB/s）
            {current.tags.length ? <em> · {current.tags.join(' · ')}</em> : null}
          </p>
        </div>

        <ChartCanvas mainHardware={hw} comparisonHardware={null} point={point} />

        {!reveal ? (
          <div className="roofline-gate-answers" role="group" aria-label="选择 bound 类型">
            <button type="button" onClick={() => void submitAnswer('memory')} className="answer answer-memory">
              Memory-bound
            </button>
            <button type="button" onClick={() => void submitAnswer('compute')} className="answer answer-compute">
              Compute-bound
            </button>
          </div>
        ) : (
          <div className={`roofline-gate-feedback ${reveal.correct ? 'correct' : 'wrong'}`}>
            <strong>{reveal.correct ? '✓ 答对' : '✗ 答错'}</strong>
            <span>正确答案：{reveal.correctAnswer === 'memory' ? 'Memory-bound' : 'Compute-bound'}</span>
            <p>{reveal.explanation}</p>
            <button type="button" onClick={() => void advance()}>
              {phase.index >= phase.questions.length - 1 ? '查看结果' : '下一题'}
            </button>
          </div>
        )}

        {error ? <p className="roofline-gate-error">{error}</p> : null}
      </div>
    );
  }

  // result
  const { result } = phase;
  return (
    <div className={`roofline-gate roofline-gate-result ${result.passed ? 'passed' : 'failed'}`}>
      <h4>
        {result.passed ? '✓ 通过判断力检验' : '未通过本次检验'}{' '}
        <span>
          {result.correctCount} / {result.total}
        </span>
      </h4>
      <p>
        {result.passed
          ? '本节自动标记为已完成。直觉已就位，可以进入下一节。'
          : '建议回到正文「机制、公式与推导」段重读拐点判定，再次检验。'}
      </p>
      <div className="roofline-gate-result-actions">
        <button type="button" onClick={resetToIdle}>
          {result.passed ? '关闭' : '返回'}
        </button>
        <button type="button" onClick={() => void startAttempt()}>
          {result.passed ? '重测' : '再次检验'}
        </button>
      </div>
      {error ? <p className="roofline-gate-error">{error}</p> : null}
    </div>
  );
}

function describeStatus(gate: TopicGate): string {
  if (gate.status === 'passed') {
    const last = gate.lastAttempt;
    const date = last?.completedAt?.slice(0, 10) ?? '';
    return `✓ 已通过 (${last?.correctCount ?? '?'}/${last?.total ?? '?'}${date ? ', ' + date : ''})`;
  }
  if (gate.status === 'failed') {
    const last = gate.lastAttempt;
    return `上次成绩 ${last?.correctCount ?? 0}/${last?.total ?? 0}，未达 ≥ ${gate.attemptConfig.passingThreshold}`;
  }
  return '未开始 — 这是 T01 的判断力检验。先在上面的图里探索，再来作答。';
}

export type { Phase };
