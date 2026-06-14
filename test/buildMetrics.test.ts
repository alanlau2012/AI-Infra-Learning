import { describe, expect, it } from 'vitest';
import { buildMetrics } from '../src/renderer/components/InteractiveLesson';
import type { TopicInteractiveDemoKind, TopicInteractiveMetric } from '../src/shared/types';

// 取某个 kind 下某个 metric 在指定 (step, intensity) 的数值部分。
// buildMetrics 的 value 形如 "123 ms" / "45 tok/s" / "12 GB"，parseFloat 取前缀数字。
function num(
  kind: TopicInteractiveDemoKind,
  key: TopicInteractiveMetric,
  step: number,
  intensity: number
): number {
  const result = buildMetrics(kind, [key], step, intensity);
  return Number.parseFloat(result[0].value);
}

describe('buildMetrics — 机制定性响应', () => {
  // 1. KV 撑满（高 intensity）压吞吐
  it('kv_paged_attention throughput 在高负载时低于低负载（KV 满压吞吐）', () => {
    expect(num('kv_paged_attention', 'throughput', 0, 95)).toBeLessThan(
      num('kv_paged_attention', 'throughput', 0, 40)
    );
  });

  // 2. 分页（step2）放缓 KV 增长；且随负载变化
  it('kv_paged_attention kvMemory 分页后增速放缓，且随负载变化', () => {
    const g01 = num('kv_paged_attention', 'kvMemory', 1, 62) - num('kv_paged_attention', 'kvMemory', 0, 62);
    const g12 = num('kv_paged_attention', 'kvMemory', 2, 62) - num('kv_paged_attention', 'kvMemory', 1, 62);
    expect(g12).toBeLessThan(g01);
    expect(num('kv_paged_attention', 'kvMemory', 0, 95)).not.toBe(num('kv_paged_attention', 'kvMemory', 0, 62));
  });

  // 3. chunked prefill（step2）让 TTFT 略升（反直觉修正点）
  it('batching_prefill TTFT 在 chunked prefill 步（step2）高于 step1', () => {
    expect(num('batching_prefill', 'TTFT', 2, 62)).toBeGreaterThan(num('batching_prefill', 'TTFT', 1, 62));
  });

  // 4. 连续 batching 提吞吐
  it('batching_prefill throughput 随 step 提升', () => {
    expect(num('batching_prefill', 'throughput', 3, 62)).toBeGreaterThan(
      num('batching_prefill', 'throughput', 0, 62)
    );
  });

  // 5. P/D 分离（step1）改善 TTFT
  it('distributed_inference TTFT 在 P/D 分离后（step1）低于单池（step0）', () => {
    expect(num('distributed_inference', 'TTFT', 1, 62)).toBeLessThan(
      num('distributed_inference', 'TTFT', 0, 62)
    );
  });

  // 6. P/D 分离新增 KV transfer 成本（bandwidth 升）
  it('distributed_inference bandwidth 在 P/D 分离后（step1）高于单池（step0）', () => {
    expect(num('distributed_inference', 'bandwidth', 1, 62)).toBeGreaterThan(
      num('distributed_inference', 'bandwidth', 0, 62)
    );
  });

  // 7. P/D 吞吐收益在高并发时更大（低并发 transfer 吃收益）
  it('distributed_inference P/D 吞吐收益在高负载时更大', () => {
    const lowGain =
      num('distributed_inference', 'throughput', 1, 40) / num('distributed_inference', 'throughput', 0, 40);
    const highGain =
      num('distributed_inference', 'throughput', 1, 95) / num('distributed_inference', 'throughput', 0, 95);
    expect(highGain).toBeGreaterThan(lowGain);
  });

  // 8. pipeline 重叠提吞吐
  it('ascend_operator throughput 随 step 提升', () => {
    expect(num('ascend_operator', 'throughput', 2, 62)).toBeGreaterThan(
      num('ascend_operator', 'throughput', 0, 62)
    );
  });
});
