// @vitest-environment jsdom
/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  },
  {
    id: 'S2',
    name: '昇腾硬件与推理引擎',
    description: '平台阶段',
    sortOrder: 2,
    topics: [
      {
        id: 'T04',
        stageId: 'S2',
        name: 'Ascend 910B 系列硬件规格与分级策略',
        sortOrder: 1,
        difficulty: 2,
        studyTimeMinutes: 35,
        status: 'completed'
      }
    ]
  }
];

const topic: TopicDetail = {
  ...outline[0].topics[0],
  why: '所有推理优化决策的根基。',
  realWorldConnection: 'MTP 能提升 memory-bound 场景效率。',
  keyPoints: ['Arithmetic Intensity = FLOPs / Bytes', 'Decode 阶段通常是 memory-bound'],
  prerequisites: [],
  bodyMd: [
    '## 核心判断',
    '',
    '先判断瓶颈是在算力还是带宽，再决定后续优化路线。',
    '',
    '```text',
    'Arithmetic Intensity = FLOPs / Bytes',
    '```'
  ].join('\n')
};

const progress: ProgressSummary = {
  totalTopics: 21,
  completedTopics: 1,
  inProgressTopics: 0,
  notStartedTopics: 20,
  stageProgress: [
    { stageId: 'S1', stageName: '第一性原理', totalTopics: 2, completedTopics: 0 },
    { stageId: 'S2', stageName: '昇腾硬件与推理引擎', totalTopics: 1, completedTopics: 1 }
  ]
};

const t02Topic: TopicDetail = {
  id: 'T02',
  stageId: 'S1',
  name: 'KV Cache 与显存计算',
  sortOrder: 2,
  difficulty: 2,
  studyTimeMinutes: 40,
  status: 'not_started',
  why: 'KV Cache 直接决定并发能力。',
  realWorldConnection: '910B3 与 910B4 的容量差异会直接影响部署策略。',
  keyPoints: ['KV Cache 公式：2 × layers × kv_heads × head_dim × seq_len × batch'],
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
  it('loads the learning outline, body markdown, and stage progress', async () => {
    render(<App />);

    expect(await screen.findByText('AI Infra 学习系统')).toBeInTheDocument();
    expect(screen.getByText('Phase 1 MVP')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '核心判断' })).toBeInTheDocument();
    expect(screen.getByText('先判断瓶颈是在算力还是带宽，再决定后续优化路线。')).toBeInTheDocument();
    expect(screen.getByText('总进度 1/21')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '总学习进度' })).toHaveAttribute('value', '5');
    const stageProgress = screen.getByLabelText('阶段进度');
    expect(within(stageProgress).getByText('阶段进度')).toBeInTheDocument();
    expect(within(stageProgress).getByText('第一性原理')).toBeInTheDocument();
    expect(within(stageProgress).getByText('0/2')).toBeInTheDocument();
    expect(within(stageProgress).getByText('昇腾硬件与推理引擎')).toBeInTheDocument();
    expect(within(stageProgress).getByText('1/1')).toBeInTheDocument();
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
            id: 'T03',
            stageId: 'S1',
            name: '第二专题',
            sortOrder: 3,
            difficulty: 1,
            studyTimeMinutes: 30,
            status: 'not_started'
          }
        ]
      },
      outline[1]
    ];
    vi.mocked(window.learning.getOutline).mockResolvedValue(outline2);
    vi.mocked(window.learning.getTopic)
      .mockResolvedValueOnce(topic)
      .mockRejectedValueOnce(new Error('Topic fetch failed'));

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: /T03.*第二专题/ }));

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

  it('switches between list and roadmap views and keeps the roadmap entry available', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('tab', { name: /路线图/ }));
    expect(await screen.findByTestId('roadmap-root')).toBeInTheDocument();
    expect(window.learning.getRoadmapGraph).toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /列表/ }));
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
  });

  it('shows a fallback message when a topic body is not ready yet', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('button', { name: /T02.*KV Cache 与显存计算/ }));

    await screen.findByRole('heading', { name: 'KV Cache 与显存计算' });
    const detailSection = screen.getByRole('heading', { name: '详细内容' }).closest('section');
    expect(detailSection).not.toBeNull();
    expect(within(detailSection as HTMLElement).getByText('正文内容待补充。')).toBeInTheDocument();
  });

  it('selecting T02 from the sidebar loads its detail through getTopic', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('button', { name: /T02.*KV Cache 与显存计算/ }));

    await waitFor(() => {
      expect(window.learning.getTopic).toHaveBeenCalledWith('T02');
    });
    await screen.findByRole('heading', { name: 'KV Cache 与显存计算' });
  });
});
