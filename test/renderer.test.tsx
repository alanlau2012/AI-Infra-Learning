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
      }
    ]
  }
];

const topic: TopicDetail = {
  ...outline[0].topics[0],
  why: '所有推理优化决策的根基。',
  realWorldConnection: 'MTP 能提升 memory-bound 场景效率。',
  keyPoints: ['Arithmetic Intensity = FLOPs / Bytes', 'Decode 阶段 memory-bound'],
  prerequisites: []
};

const progress: ProgressSummary = {
  totalTopics: 21,
  completedTopics: 0,
  inProgressTopics: 0,
  notStartedTopics: 21,
  stageProgress: [{ stageId: 'S1', stageName: '第一性原理', totalTopics: 1, completedTopics: 0 }]
};

beforeEach(() => {
  window.learning = {
    getOutline: vi.fn().mockResolvedValue(outline),
    getProgress: vi.fn().mockResolvedValue(progress),
    getTopic: vi.fn().mockResolvedValue(topic),
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
});
