// @vitest-environment jsdom
/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App';
import type { ProgressSummary, SeedReloadEvent, StageWithTopics, TopicDetail } from '../src/shared/types';

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
  ].join('\n'),
  sources: []
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
  bodyMd: null,
  sources: []
};

let seedReloadCallback: ((event: SeedReloadEvent) => void) | null = null;

beforeEach(() => {
  seedReloadCallback = null;
  document.documentElement.removeAttribute('data-theme');
  window.learning = {
    getOutline: vi.fn().mockResolvedValue(outline),
    getProgress: vi.fn().mockResolvedValue(progress),
    getSettings: vi.fn().mockResolvedValue({ theme: 'light' }),
    getTopic: vi.fn().mockImplementation((id: string) =>
      Promise.resolve(id === 'T02' ? t02Topic : topic)
    ),
    getRoadmapGraph: vi.fn().mockResolvedValue({
      edges: [{ from: 'T01', to: 'T02' }],
      mainTrack: ['T01', 'T02']
    }),
    updateTopicStatus: vi.fn().mockResolvedValue({ ...topic, status: 'completed' }),
    updateTheme: vi.fn().mockImplementation((theme: string) => Promise.resolve({ theme })),
    getTopicGate: vi.fn().mockResolvedValue(null),
    startGateAttempt: vi.fn().mockResolvedValue([]),
    checkSingleAnswer: vi.fn().mockResolvedValue({
      questionId: '',
      correct: false,
      correctAnswer: 'memory',
      explanation: '',
      operatingPoint: { ai: 0, perfTflops: 0 }
    }),
    finalizeAttempt: vi.fn().mockResolvedValue({ passed: false, correctCount: 0, total: 5 }),
    onSeedReloaded: vi.fn().mockImplementation((callback: (event: SeedReloadEvent) => void) => {
      seedReloadCallback = callback;
      return vi.fn();
    })
  };
});

describe('App', () => {
  it('loads the learning outline, body markdown, and stage progress', async () => {
    render(<App />);

    expect(await screen.findByText('AI Infra 学习系统')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Workspace')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '核心判断' })).toBeInTheDocument();
    expect(screen.getByText('先判断瓶颈是在算力还是带宽，再决定后续优化路线。')).toBeInTheDocument();
    expect(screen.getByLabelText('学习进度概览')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('1/21 已完成 · 0 学习中')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '总学习进度' })).toHaveAttribute('value', '5');
    const toc = screen.getByRole('region', { name: '本节目录' });
    expect(within(toc).getByRole('link', { name: '核心判断' })).toHaveAttribute('href', '#section-1-核心判断');
    expect(screen.getByRole('region', { name: '学习检查点' })).toBeInTheDocument();
  });

  it('loads persisted theme settings and applies them to the document', async () => {
    vi.mocked(window.learning.getSettings).mockResolvedValue({ theme: 'dark' });

    render(<App />);

    await screen.findByText('Knowledge Workspace');
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(window.learning.getSettings).toHaveBeenCalled();
  });

  it('falls back to light theme when the settings IPC is temporarily unavailable', async () => {
    vi.mocked(window.learning.getSettings).mockRejectedValue(new Error("No handler registered for 'learning:getSettings'"));

    render(<App />);

    expect(await screen.findByText('Knowledge Workspace')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('updates the persisted theme from the settings menu', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Knowledge Workspace');

    await user.click(screen.getByRole('button', { name: '设置' }));
    const menu = screen.getByRole('menu', { name: '主题设置' });
    await user.click(within(menu).getByRole('button', { name: '深色' }));

    await waitFor(() => {
      expect(window.learning.updateTheme).toHaveBeenCalledWith('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  it('reloads the current topic when the development seed file changes', async () => {
    const reloadedTopic = {
      ...topic,
      bodyMd: '## 核心判断\n\n热重载后的正文。'
    };
    vi.mocked(window.learning.getTopic)
      .mockResolvedValueOnce(topic)
      .mockResolvedValueOnce(reloadedTopic);

    render(<App />);
    expect(await screen.findByText('先判断瓶颈是在算力还是带宽，再决定后续优化路线。')).toBeInTheDocument();

    await act(async () => {
      seedReloadCallback?.({ ok: true, reloadedAt: Date.now() });
    });

    expect(await screen.findByText('热重载后的正文。')).toBeInTheDocument();
    expect(window.learning.getTopic).toHaveBeenLastCalledWith('T01');
  });

  it('updates topic status through the preload learning API', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
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
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: /T03.*第二专题/ }));

    expect(await screen.findByText('Topic fetch failed')).toBeInTheDocument();
  });

  it('shows error screen when updateTopicStatus fails', async () => {
    const user = userEvent.setup();
    vi.mocked(window.learning.updateTopicStatus).mockRejectedValue(new Error('Status update failed'));

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
    await user.click(screen.getByRole('button', { name: '已完成' }));

    expect(await screen.findByText('Status update failed')).toBeInTheDocument();
    expect(screen.getByText('操作失败')).toBeInTheDocument();
    expect(screen.queryByText('启动失败')).not.toBeInTheDocument();
  });

  it('switches between list and roadmap views and keeps the roadmap entry available', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('tab', { name: /路线图/ }));
    expect(await screen.findByTestId('roadmap-root')).toBeInTheDocument();
    expect(window.learning.getRoadmapGraph).toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /列表/ }));
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });
  });

  it('shows a fallback message when a topic body is not ready yet', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('button', { name: /T02.*KV Cache 与显存计算/ }));

    await screen.findByRole('heading', { level: 3, name: 'KV Cache 与显存计算' });
    const detailSection = screen.getByLabelText('详细内容');
    expect(within(detailSection).getByText('正文内容待补充。')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '前置知识' })).toBeInTheDocument();
  });

  it('selecting T02 from the sidebar loads its detail through getTopic', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    await user.click(screen.getByRole('button', { name: /T02.*KV Cache 与显存计算/ }));

    await waitFor(() => {
      expect(window.learning.getTopic).toHaveBeenCalledWith('T02');
    });
    await screen.findByRole('heading', { level: 3, name: 'KV Cache 与显存计算' });
  });

  it('shows an empty sources state when the topic carries no sources', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    const sources = screen.getByRole('region', { name: '可信来源' });
    expect(within(sources).getByText('暂无来源信息')).toBeInTheDocument();
  });

  it('renders authoritative sources with confidence badges and external link attributes', async () => {
    const sourcedTopic: TopicDetail = {
      ...topic,
      sources: [
        {
          id: 'qwen3-next-card',
          title: 'Qwen3-Next-80B-A3B-Instruct Model Card',
          url: 'https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct',
          publisher: 'Hugging Face / Qwen Team',
          last_verified: '2026-04-28',
          confidence: 'high',
          covers: ['Qwen3-Next 系列总参 80B / 激活 3B', '48 层 = 12 × (3+1)']
        },
        {
          id: 'vllm-pr',
          title: 'vLLM Gated DeltaNet 共享层 PR',
          url: 'https://github.com/vllm-project/vllm/pull/37975',
          publisher: 'vLLM Project',
          last_verified: '2026-04-28',
          confidence: 'medium',
          covers: ['vLLM 已为 Qwen3-Next 共用 GatedDeltaNetAttention 实现']
        }
      ]
    };
    vi.mocked(window.learning.getTopic).mockResolvedValue(sourcedTopic);

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'Compute-bound vs Memory-bound：推理的第一性原理' });

    const sources = await screen.findByRole('region', { name: '可信来源' });
    const links = within(sources).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0].getAttribute('rel') ?? '').toContain('noopener');
    expect(within(sources).getByText('官方来源')).toBeInTheDocument();
    expect(within(sources).getByText('社区/二手')).toBeInTheDocument();
    expect(within(sources).getByText(/Qwen3-Next 系列总参 80B \/ 激活 3B/)).toBeInTheDocument();
    expect(within(sources).getByText('vLLM Project')).toBeInTheDocument();
  });
});
