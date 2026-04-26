// @vitest-environment jsdom
/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App';
import type { ProgressSummary, StageWithTopics, TopicDetail } from '../src/shared/types';

const outline: StageWithTopics[] = [
  {
    id: 'S1',
    name: '第一性原理',
    description: '基础阶段',
    sortOrder: 1,
    topics: [
      {
        id: 'T01',
        stageId: 'S1',
        name: 'Compute-bound vs Memory-bound：推理的第一性原理',
        sortOrder: 1,
        difficulty: 2,
        studyTimeMinutes: 45,
        status: 'not_started'
      },
      {
        id: 'T02',
        stageId: 'S1',
        name: 'KV Cache 与显存计算',
        sortOrder: 2,
        difficulty: 2,
        studyTimeMinutes: 40,
        status: 'not_started'
      }
    ]
  }
];

const topic: TopicDetail = {
  ...outline[0].topics[0],
  why: '所有推理优化决策的根基。',
  realWorldConnection: 'MTP 能提升 memory-bound 场景效率。',
  keyPoints: ['Arithmetic Intensity = FLOPs / Bytes', 'Decode 阶段 memory-bound'],
  prerequisites: [],
  bodyMd: null
};

const progress: ProgressSummary = {
  totalTopics: 21,
  completedTopics: 0,
  inProgressTopics: 0,
  notStartedTopics: 21,
  stageProgress: [{ stageId: 'S1', stageName: '第一性原理', totalTopics: 1, completedTopics: 0 }]
};

const t02Topic: TopicDetail = {
  id: 'T02',
  stageId: 'S1',
  name: 'KV Cache 与显存计算',
  sortOrder: 2,
  difficulty: 2,
  studyTimeMinutes: 40,
  status: 'not_started',
  why: 'KV Cache 决定并发能力。',
  realWorldConnection: '910B3 vs 910B4 容量差异。',
  keyPoints: ['公式：2 × num_layers × ...'],
  prerequisites: [outline[0].topics[0]],
  bodyMd: null
};

beforeEach(() => {
  window.learning = {
    getOutline: vi.fn().mockResolvedValue(outline),
    getProgress: vi.fn().mockResolvedValue(progress),
    getTopic: vi.fn().mockImplementation((id: string) =>
      Promise.resolve(id === 'T02' ? t02Topic : topic)
    ),
    getRoadmapGraph: vi.fn().mockResolvedValue({
      edges: [{ from: 'T01', to: 'T02' }],
      mainTrack: ['T01', 'T02']
    }),
    updateTopicStatus: vi.fn().mockResolvedValue({ ...topic, status: 'completed' })
  };
});

describe('App', () => {
  it('loads the learning outline and first topic detail', async () => {
    render(<App />);

    expect(await screen.findByText('AI Infra 学习系统')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' })
    ).toBeInTheDocument();
    expect(await screen.findByText('为什么重要')).toBeInTheDocument();
    expect(screen.getByText('Arithmetic Intensity = FLOPs / Bytes')).toBeInTheDocument();
    expect(screen.getByText('进度 0/21')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '总学习进度' })).toHaveAttribute('value', '0');
  });

  it('updates topic status through the preload learning API', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: '已完成' }));

    await waitFor(() => {
      expect(window.learning.updateTopicStatus).toHaveBeenCalledWith('T01', 'completed');
    });
  });

  it('switches between list and roadmap views and triggers the roadmap IPC on first switch', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('tab', { name: /路线图/ }));
    expect(await screen.findByTestId('roadmap-root')).toBeInTheDocument();
    expect(window.learning.getRoadmapGraph).toHaveBeenCalled();

    // 切回列表视图后详情仍能正常显示。
    await user.click(screen.getByRole('tab', { name: /列表/ }));
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
  });

  it('selecting T02 from the sidebar loads its detail through getTopic', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('button', { name: /T02KV Cache 与显存计算/ }));

    await waitFor(() => {
      expect(window.learning.getTopic).toHaveBeenCalledWith('T02');
    });
    await screen.findByRole('heading', { name: 'KV Cache 与显存计算' });
  });
});
