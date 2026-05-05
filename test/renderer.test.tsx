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
    name: '平台底座与私有化基础设施',
    description: '平台基础阶段',
    sortOrder: 1,
    topics: [
      {
        id: 'T01',
        stageId: 'S1',
        name: '企业 Agent 平台总体架构',
        sortOrder: 1,
        difficulty: 3,
        studyTimeMinutes: 40,
        status: 'not_started'
      },
      {
        id: 'T02',
        stageId: 'S1',
        name: '私有化 LLM 基础设施',
        sortOrder: 2,
        difficulty: 3,
        studyTimeMinutes: 45,
        status: 'not_started'
      }
    ]
  },
  {
    id: 'S2',
    name: '能力生态与企业集成',
    description: '生态阶段',
    sortOrder: 2,
    topics: [
      {
        id: 'T05',
        stageId: 'S2',
        name: 'Skill 生态设计',
        sortOrder: 1,
        difficulty: 3,
        studyTimeMinutes: 45,
        status: 'completed'
      }
    ]
  }
];

const topic: TopicDetail = {
  ...outline[0].topics[0],
  why: '理解从算力到业务工作台的完整平台分层。',
  realWorldConnection: '平台蓝图是跨基础设施、数据、安全、IT 和业务团队协同的共同地图。',
  keyPoints: ['企业 Agent 平台要覆盖基础设施、Runtime、Skill 和工作台', '平台负责人要能判断哪些能力必须平台化'],
  prerequisites: [],
  bodyMd: [
    '## 角色定位与问题场景',
    '',
    'Enterprise Agent Platform Builder 要把 LLM 变成企业级生产力基础设施。',
    '',
    '```text',
    'LLM → Agent Runtime → Skill → Tool → Workbench',
    '```'
  ].join('\n'),
  sources: []
};

const progress: ProgressSummary = {
  totalTopics: 15,
  completedTopics: 1,
  inProgressTopics: 0,
  notStartedTopics: 14,
  stageProgress: [
    { stageId: 'S1', stageName: '平台底座与私有化基础设施', totalTopics: 2, completedTopics: 0 },
    { stageId: 'S2', stageName: '能力生态与企业集成', totalTopics: 1, completedTopics: 1 }
  ]
};

const t02Topic: TopicDetail = {
  id: 'T02',
  stageId: 'S1',
  name: '私有化 LLM 基础设施',
  sortOrder: 2,
  difficulty: 3,
  studyTimeMinutes: 45,
  status: 'not_started',
  why: '大型企业内网环境通常不能简单依赖外部 API。',
  realWorldConnection: '私有化基础设施能力决定平台能否在内网约束下稳定供给模型能力。',
  keyPoints: ['私有化 LLM 基础设施要覆盖算力、模型部署和在线服务'],
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
    onSeedReloaded: vi.fn().mockImplementation((callback: (event: SeedReloadEvent) => void) => {
      seedReloadCallback = callback;
      return vi.fn();
    })
  };
});

describe('App', () => {
  it('loads the learning outline, body markdown, and stage progress', async () => {
    render(<App />);

    expect(await screen.findByText('Enterprise Agent Platform Skills')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Workspace')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '角色定位与问题场景' })).toBeInTheDocument();
    expect(screen.getByText('Enterprise Agent Platform Builder 要把 LLM 变成企业级生产力基础设施。')).toBeInTheDocument();
    expect(screen.getByLabelText('学习进度概览')).toBeInTheDocument();
    expect(screen.getByText('7%')).toBeInTheDocument();
    expect(screen.getByText('1/15 已完成 · 0 学习中')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '总学习进度' })).toHaveAttribute('value', '7');
    const toc = screen.getByRole('region', { name: '本节目录' });
    expect(within(toc).getByRole('link', { name: '角色定位与问题场景' })).toHaveAttribute(
      'href',
      '#section-1-角色定位与问题场景'
    );
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
      bodyMd: '## 角色定位与问题场景\n\n热重载后的正文。'
    };
    vi.mocked(window.learning.getTopic)
      .mockResolvedValueOnce(topic)
      .mockResolvedValueOnce(reloadedTopic);

    render(<App />);
    expect(
      await screen.findByText('Enterprise Agent Platform Builder 要把 LLM 变成企业级生产力基础设施。')
    ).toBeInTheDocument();

    await act(async () => {
      seedReloadCallback?.({ ok: true, reloadedAt: Date.now() });
    });

    expect(await screen.findByText('热重载后的正文。')).toBeInTheDocument();
    expect(window.learning.getTopic).toHaveBeenLastCalledWith('T01');
  });

  it('updates topic status through the preload learning API', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });
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
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });
    await user.click(screen.getByRole('button', { name: /T03.*第二专题/ }));

    expect(await screen.findByText('Topic fetch failed')).toBeInTheDocument();
  });

  it('shows error screen when updateTopicStatus fails', async () => {
    const user = userEvent.setup();
    vi.mocked(window.learning.updateTopicStatus).mockRejectedValue(new Error('Status update failed'));

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });
    await user.click(screen.getByRole('button', { name: '已完成' }));

    expect(await screen.findByText('Status update failed')).toBeInTheDocument();
    expect(screen.getByText('操作失败')).toBeInTheDocument();
    expect(screen.queryByText('启动失败')).not.toBeInTheDocument();
  });

  it('switches between list and roadmap views and keeps the roadmap entry available', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });

    await user.click(screen.getByRole('tab', { name: /路线图/ }));
    expect(await screen.findByTestId('roadmap-root')).toBeInTheDocument();
    expect(window.learning.getRoadmapGraph).toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /列表/ }));
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });
  });

  it('shows a fallback message when a topic body is not ready yet', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });

    await user.click(screen.getByRole('button', { name: /T02.*私有化 LLM 基础设施/ }));

    await screen.findByRole('heading', { level: 3, name: '私有化 LLM 基础设施' });
    const detailSection = screen.getByLabelText('详细内容');
    expect(within(detailSection).getByText('正文内容待补充。')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '前置知识' })).toBeInTheDocument();
  });

  it('selecting T02 from the sidebar loads its detail through getTopic', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });

    await user.click(screen.getByRole('button', { name: /T02.*私有化 LLM 基础设施/ }));

    await waitFor(() => {
      expect(window.learning.getTopic).toHaveBeenCalledWith('T02');
    });
    await screen.findByRole('heading', { level: 3, name: '私有化 LLM 基础设施' });
  });

  it('shows an empty sources state when the topic carries no sources', async () => {
    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });

    const sources = screen.getByRole('region', { name: '可信来源' });
    expect(within(sources).getByText('暂无来源信息')).toBeInTheDocument();
  });

  it('renders authoritative sources with confidence badges and external link attributes', async () => {
    const sourcedTopic: TopicDetail = {
      ...topic,
      sources: [
        {
          id: 'enterprise-agent-platform-skills',
          title: 'Enterprise Agent Platform Skills',
          url: 'https://chatgpt.com/c/69f9bff1-3938-8393-8fb3-1659afa330e2',
          publisher: 'User-provided clipping',
          last_verified: '2026-05-05',
          confidence: 'high',
          covers: ['Enterprise Agent Platform Builder 的角色定位', '15 类关键能力']
        },
        {
          id: 'vllm-pr',
          title: 'Platform governance note',
          url: 'https://example.com/platform-governance',
          publisher: 'Internal reference',
          last_verified: '2026-05-05',
          confidence: 'medium',
          covers: ['Skill、Tool、评测、安全和组织推进的治理框架']
        }
      ]
    };
    vi.mocked(window.learning.getTopic).mockResolvedValue(sourcedTopic);

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: '企业 Agent 平台总体架构' });

    const sources = await screen.findByRole('region', { name: '可信来源' });
    const links = within(sources).getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://chatgpt.com/c/69f9bff1-3938-8393-8fb3-1659afa330e2');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0].getAttribute('rel') ?? '').toContain('noopener');
    expect(within(sources).getByText('官方来源')).toBeInTheDocument();
    expect(within(sources).getByText('参考来源')).toBeInTheDocument();
    expect(within(sources).getByText(/Enterprise Agent Platform Builder 的角色定位/)).toBeInTheDocument();
    expect(within(sources).getByText('Internal reference')).toBeInTheDocument();
  });
});
