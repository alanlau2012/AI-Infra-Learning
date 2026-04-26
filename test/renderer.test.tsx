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

  it('shows error UI when initial data load fails', async () => {
    vi.mocked(window.learning.getOutline).mockRejectedValue(new Error('IPC bridge broken'));

    render(<App />);

    expect(await screen.findByText('启动失败')).toBeInTheDocument();
    expect(await screen.findByText('IPC bridge broken')).toBeInTheDocument();
  });

  it('shows error when selectTopic fails', async () => {
    const user = userEvent.setup();

    const outline2: typeof outline = [
      {
        ...outline[0],
        topics: [
          ...outline[0].topics,
          {
            id: 'T02',
            stageId: 'S1',
            name: '第二专题',
            sortOrder: 2,
            difficulty: 1,
            studyTimeMinutes: 30,
            status: 'not_started'
          }
        ]
      }
    ];
    vi.mocked(window.learning.getOutline).mockResolvedValue(outline2);
    vi.mocked(window.learning.getTopic)
      .mockResolvedValueOnce(topic)
      .mockRejectedValueOnce(new Error('Topic fetch failed'));

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: /T02.*第二专题/ }));

    expect(await screen.findByText('Topic fetch failed')).toBeInTheDocument();
  });

  it('shows error screen when updateTopicStatus fails', async () => {
    const user = userEvent.setup();
    vi.mocked(window.learning.updateTopicStatus).mockRejectedValue(new Error('Status update failed'));

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: '已完成' }));

    expect(await screen.findByText('Status update failed')).toBeInTheDocument();
    expect(screen.getByText('启动失败')).toBeInTheDocument();
  });
});
