// @vitest-environment jsdom
/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/renderer/App';
import type { ProgressSummary, SeedReloadEvent, StageWithTopics, TopicDetail } from '../src/shared/types';

const outline: StageWithTopics[] = [
  {
    id: 'S1',
    name: 'AI Infra 栈全景',
    description: '建立 NVIDIA 与昇腾两条技术栈的层级地图。',
    sortOrder: 1,
    topics: [
      {
        id: 'T01',
        stageId: 'S1',
        name: 'NVIDIA vs 昇腾 AI Infra 栈全景',
        sortOrder: 1,
        difficulty: 2,
        studyTimeMinutes: 35,
        status: 'not_started'
      }
    ]
  },
  {
    id: 'S2',
    name: '推理系统关键机制',
    description: '围绕 KV Cache、PagedAttention 和调度建立性能直觉。',
    sortOrder: 2,
    topics: [
      {
        id: 'T02',
        stageId: 'S2',
        name: 'KV Cache 与 PagedAttention',
        sortOrder: 1,
        difficulty: 3,
        studyTimeMinutes: 45,
        status: 'not_started'
      }
    ]
  }
];

const topic: TopicDetail = {
  ...outline[0].topics[0],
  why: '先把硬件、运行时、编译器、算子库、框架适配和推理服务分层。',
  realWorldConnection: '企业做私有化 AI Infra 时，需要判断问题属于哪一层。',
  keyPoints: ['NVIDIA 侧按 Triton、TensorRT-LLM、CUDA Runtime、NCCL、GPU 建立路径。'],
  prerequisites: [],
  bodyMd: '## 角色定位与问题场景\n\n这一节是整套 demo 的地图。',
  interactiveDemo: {
    kind: 'stack_compare',
    title: '两条 AI Infra 栈逐层对照',
    summary: '点击步骤观察同一类工程问题在 NVIDIA 与昇腾体系里分别落在哪一层。',
    metrics: ['throughput', 'bandwidth'],
    steps: [
      { id: 'service', label: '服务入口', explanation: 'Triton、MindIE、vLLM-Ascend 面向请求接入。' },
      { id: 'engine', label: '推理引擎', explanation: 'TensorRT-LLM 与 CANN/MindIE 负责高效推理路径。' }
    ]
  },
  sources: [
    {
      id: 'nvidia-tensorrt-llm',
      title: 'NVIDIA TensorRT-LLM Documentation',
      url: 'https://docs.nvidia.com/tensorrt-llm/',
      publisher: 'NVIDIA',
      last_verified: '2026-06-07',
      confidence: 'high',
      covers: ['TensorRT-LLM 文档入口']
    }
  ]
};

const t02Topic: TopicDetail = {
  ...outline[1].topics[0],
  why: 'KV Cache 是推理服务的核心内存资源。',
  realWorldConnection: 'KV 占用和 prefix 命中会影响真实并发能力。',
  keyPoints: ['KV Cache 复用历史 token 的 key/value。'],
  prerequisites: [outline[0].topics[0]],
  bodyMd: '## 角色定位与问题场景\n\nKV Cache 是推理系统核心资源。',
  interactiveDemo: {
    kind: 'kv_paged_attention',
    title: 'KV 卡片缓存与分页房间',
    summary: '拖动负载观察 token 变长后 KV block 如何增长。',
    metrics: ['TPOT', 'kvMemory', 'throughput'],
    steps: [
      { id: 'cache', label: '追加 K/V', explanation: '新 token 只追加自己的 K/V。' },
      { id: 'paged', label: '分页 block', explanation: 'PagedAttention 把 KV 拆成 block。' }
    ]
  },
  sources: []
};

const progress: ProgressSummary = {
  totalTopics: 5,
  completedTopics: 1,
  inProgressTopics: 0,
  notStartedTopics: 4,
  stageProgress: [
    { stageId: 'S1', stageName: 'AI Infra 栈全景', totalTopics: 1, completedTopics: 0 },
    { stageId: 'S2', stageName: '推理系统关键机制', totalTopics: 1, completedTopics: 1 }
  ]
};

let seedReloadCallback: ((event: SeedReloadEvent) => void) | null = null;

beforeEach(() => {
  seedReloadCallback = null;
  document.documentElement.removeAttribute('data-theme');
  window.learning = {
    getOutline: vi.fn().mockResolvedValue(outline),
    getProgress: vi.fn().mockResolvedValue(progress),
    getSettings: vi.fn().mockResolvedValue({ theme: 'light' }),
    getTopic: vi.fn().mockImplementation((id: string) => Promise.resolve(id === 'T02' ? t02Topic : topic)),
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
  it('loads the outline, markdown, sources, and interactive lesson', async () => {
    render(<App />);

    expect(await screen.findByText('AI Infra Learning 2026')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Workspace')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 3, name: 'NVIDIA vs 昇腾 AI Infra 栈全景' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '角色定位与问题场景' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '两条 AI Infra 栈逐层对照 交互教学' })).toBeInTheDocument();
    expect(screen.getByText('吞吐')).toBeInTheDocument();
    expect(screen.getByText('带宽')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '可信来源' })).toBeInTheDocument();
    expect(screen.getByLabelText('学习进度概览')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('switches interactive lesson steps and updates the explanation', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'NVIDIA vs 昇腾 AI Infra 栈全景' });

    await user.click(screen.getByRole('tab', { name: /推理引擎/ }));

    expect(screen.getByText('TensorRT-LLM 与 CANN/MindIE 负责高效推理路径。')).toBeInTheDocument();
  });

  it('loads the selected topic with its own interactive demo', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'NVIDIA vs 昇腾 AI Infra 栈全景' });
    await user.click(screen.getByRole('button', { name: /T02.*KV Cache 与 PagedAttention/ }));

    await waitFor(() => {
      expect(window.learning.getTopic).toHaveBeenCalledWith('T02');
    });
    expect(await screen.findByRole('heading', { level: 3, name: 'KV Cache 与 PagedAttention' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'KV 卡片缓存与分页房间 交互教学' })).toBeInTheDocument();
    expect(screen.getByText('KV 显存')).toBeInTheDocument();
  });

  it('updates topic status through the preload learning API', async () => {
    const user = userEvent.setup();

    render(<App />);
    await screen.findByRole('heading', { level: 3, name: 'NVIDIA vs 昇腾 AI Infra 栈全景' });
    await user.click(screen.getByRole('button', { name: '已完成' }));

    await waitFor(() => {
      expect(window.learning.updateTopicStatus).toHaveBeenCalledWith('T01', 'completed');
    });
  });

  it('reloads the current topic when the development seed file changes', async () => {
    const reloadedTopic = {
      ...topic,
      bodyMd: '## 角色定位与问题场景\n\n热重载后的正文。'
    };
    vi.mocked(window.learning.getTopic).mockResolvedValueOnce(topic).mockResolvedValueOnce(reloadedTopic);

    render(<App />);
    expect(await screen.findByText('这一节是整套 demo 的地图。')).toBeInTheDocument();

    await act(async () => {
      seedReloadCallback?.({ ok: true, reloadedAt: Date.now() });
    });

    expect(await screen.findByText('热重载后的正文。')).toBeInTheDocument();
    expect(window.learning.getTopic).toHaveBeenLastCalledWith('T01');
  });
});
