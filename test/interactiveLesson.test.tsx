// @vitest-environment jsdom
/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import seed from '../resources/seed_data.json';
import InteractiveLesson, { batchPattern, buildMetrics } from '../src/renderer/components/InteractiveLesson';
import { renderMarkdown } from '../src/renderer/lib/markdown';
import type { SeedData, TopicInteractiveDemo, TopicInteractiveMetric } from '../src/shared/types';

const seedData = seed as unknown as SeedData;

const metricLabels: Record<TopicInteractiveMetric, string> = {
  TTFT: 'TTFT',
  TPOT: 'TPOT',
  throughput: '吞吐',
  kvMemory: 'KV 显存',
  bandwidth: '带宽'
};

function expectMetrics(demo: TopicInteractiveDemo, stepIndex: number, intensity: number) {
  const expected = buildMetrics(demo.kind, demo.metrics, stepIndex, intensity);
  for (const metric of expected) {
    expect(screen.getByText(metricLabels[metric.key])).toBeInTheDocument();
    expect(screen.getByText(metric.value)).toBeInTheDocument();
  }
}

describe('InteractiveLesson', () => {
  it('keeps explainer and metrics in sync for every seed demo step', async () => {
    const user = userEvent.setup();

    for (const topic of seedData.topics) {
      const demo = topic.interactive_demo;
      if (!demo) {
        throw new Error(`Missing interactive_demo for ${topic.id}`);
      }

      const { unmount } = render(<InteractiveLesson demo={demo} />);
      const region = screen.getByRole('region', { name: `${demo.title} 交互教学` });
      const explainer = region.querySelector('.interactive-explainer');
      expect(explainer).toBeTruthy();

      for (let index = 0; index < demo.steps.length; index += 1) {
        if (index > 0) {
          await user.click(within(region).getByRole('tab', { name: new RegExp(demo.steps[index].label) }));
        }

        expect(within(explainer as HTMLElement).getByText(demo.steps[index].label)).toBeInTheDocument();
        expect(within(explainer as HTMLElement).getByText(demo.steps[index].explanation)).toBeInTheDocument();
        expectMetrics(demo, index, 62);
      }

      unmount();
    }
  }, 30000);

  it('counts 24 stalled batch cells at step 0 and 0 at step 1', async () => {
    const demo = seedData.topics.find((topic) => topic.id === 'T03')?.interactive_demo;
    if (!demo) {
      throw new Error('T03 demo missing');
    }

    const user = userEvent.setup();
    const { container } = render(<InteractiveLesson demo={demo} />);

    expect(container.querySelectorAll('.batch-cell.stalled')).toHaveLength(24);

    await user.click(screen.getByRole('tab', { name: /连续补位/ }));

    expect(container.querySelectorAll('.batch-cell.stalled')).toHaveLength(0);
  });

  it('updates kvMemory when the load slider changes', () => {
    const demo = seedData.topics.find((topic) => topic.id === 'T02')?.interactive_demo;
    if (!demo) {
      throw new Error('T02 demo missing');
    }

    render(<InteractiveLesson demo={demo} />);
    const before = buildMetrics(demo.kind, demo.metrics, 0, 62).find((metric) => metric.key === 'kvMemory')?.value;

    const slider = screen.getByLabelText('负载');
    fireEvent.change(slider, { target: { value: '95' } });

    const after = buildMetrics(demo.kind, demo.metrics, 0, 95).find((metric) => metric.key === 'kvMemory')?.value;
    expect(before).not.toBe(after);
    expect(screen.getByText(after ?? '')).toBeInTheDocument();
  });

  it('advances steps during auto play', async () => {
    vi.useFakeTimers();
    try {
      const demo = seedData.topics.find((topic) => topic.id === 'T01')?.interactive_demo;
      if (!demo) {
        throw new Error('T01 demo missing');
      }

      render(<InteractiveLesson demo={demo} />);
      fireEvent.click(screen.getByRole('button', { name: '自动演示' }));

      expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(new RegExp(demo.steps[0].label));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2200);
      });
      expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(new RegExp(demo.steps[1].label));
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not render interactive markup through markdown', () => {
    for (const topic of seedData.topics) {
      expect(topic.body_md, topic.id).toBeTruthy();
      const html = renderMarkdown(topic.body_md!);
      expect(html).not.toContain('interactive-lesson');
      expect(html).not.toContain('demo-visual');
      expect(html).not.toContain(':::interactive');
    }
  });
});

describe('batchPattern', () => {
  it('uses six stalled columns at step 0 and none at step 1', () => {
    expect(batchPattern(0).stalled).toEqual([3, 4, 5, 6, 7, 8]);
    expect(batchPattern(1).stalled).toEqual([]);
  });
});
