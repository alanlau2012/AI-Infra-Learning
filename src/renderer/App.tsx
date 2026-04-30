import { Loader2, Moon, Settings, Sun } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppTheme,
  ProgressSummary,
  RoadmapGraph,
  StageWithTopics,
  StudyStatus,
  TopicDetail
} from '../shared/types';
import RoadmapView from './components/roadmap/RoadmapView';
import Sidebar from './components/Sidebar';
import TopicDetailView from './components/TopicDetailView';
import ViewTabs, { type LearningView } from './components/ViewTabs';

export default function App() {
  const [outline, setOutline] = useState<StageWithTopics[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapGraph | null>(null);
  const [view, setView] = useState<LearningView>('list');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const latestSelectId = useRef(0);
  const selectedTopicIdRef = useRef<string | null>(null);

  const loadLearningData = useCallback(async (preferredTopicId: string | null, options?: { initial?: boolean }) => {
    const requestId = ++latestSelectId.current;
    if (options?.initial) {
      setIsLoading(true);
    }
    setContentError(null);

    try {
      const [nextOutline, nextProgress, nextRoadmap, nextSettings] = await Promise.all([
        window.learning.getOutline(),
        window.learning.getProgress(),
        window.learning.getRoadmapGraph(),
        loadSettingsWithFallback()
      ]);
      const topicIds = new Set(nextOutline.flatMap((stage) => stage.topics.map((item) => item.id)));
      const firstTopicId = nextOutline[0]?.topics[0]?.id ?? null;
      const nextTopicId = preferredTopicId && topicIds.has(preferredTopicId) ? preferredTopicId : firstTopicId;
      const nextTopic = nextTopicId ? await window.learning.getTopic(nextTopicId) : null;

      if (latestSelectId.current !== requestId) {
        return;
      }

      selectedTopicIdRef.current = nextTopicId;
      setOutline(nextOutline);
      setProgress(nextProgress);
      setRoadmap(nextRoadmap);
      setTheme(nextSettings.theme);
      setSelectedTopicId(nextTopicId);
      setTopic(nextTopic);
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '加载失败';
      if (options?.initial) {
        setError(message);
      } else {
        setContentError(message);
      }
    } finally {
      if (options?.initial) {
        setIsLoading(false);
      }
    }
  }, []);

  async function loadSettingsWithFallback() {
    try {
      return await window.learning.getSettings();
    } catch {
      return { theme: 'light' as const };
    }
  }

  useEffect(() => {
    void loadLearningData(null, { initial: true });
  }, [loadLearningData]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    return window.learning.onSeedReloaded((event) => {
      if (!event.ok) {
        setContentError(event.error ?? '学习内容热重载失败');
        return;
      }
      void loadLearningData(selectedTopicIdRef.current);
    });
  }, [loadLearningData]);

  async function selectTopic(topicId: string) {
    const requestId = ++latestSelectId.current;
    selectedTopicIdRef.current = topicId;
    setSelectedTopicId(topicId);
    setContentError(null);
    try {
      const nextTopic = await window.learning.getTopic(topicId);
      if (latestSelectId.current === requestId) {
        setTopic(nextTopic);
      }
    } catch (nextError) {
      if (latestSelectId.current === requestId) {
        setContentError(nextError instanceof Error ? nextError.message : '加载专题失败');
      }
    }
  }

  async function selectFromRoadmap(topicId: string) {
    await selectTopic(topicId);
    setView('list');
  }

  async function updateStatus(status: StudyStatus) {
    if (!topic) {
      return;
    }

    setContentError(null);
    try {
      const nextTopic = await window.learning.updateTopicStatus(topic.id, status);
      const [nextOutline, nextProgress] = await Promise.all([
        window.learning.getOutline(),
        window.learning.getProgress()
      ]);
      setTopic(nextTopic);
      setOutline(nextOutline);
      setProgress(nextProgress);
    } catch (nextError) {
      setContentError(nextError instanceof Error ? nextError.message : '更新状态失败');
    }
  }

  async function refreshAfterGate() {
    if (!selectedTopicIdRef.current) {
      return;
    }
    try {
      const [nextTopic, nextOutline, nextProgress] = await Promise.all([
        window.learning.getTopic(selectedTopicIdRef.current),
        window.learning.getOutline(),
        window.learning.getProgress()
      ]);
      setTopic(nextTopic);
      setOutline(nextOutline);
      setProgress(nextProgress);
    } catch (nextError) {
      setContentError(nextError instanceof Error ? nextError.message : '刷新进度失败');
    }
  }

  async function updateTheme(theme: AppTheme) {
    setContentError(null);
    try {
      const nextSettings = await window.learning.updateTheme(theme);
      setTheme(nextSettings.theme);
      setIsSettingsOpen(false);
    } catch (nextError) {
      setContentError(nextError instanceof Error ? nextError.message : 'Failed to update theme');
    }
  }

  if (isLoading) {
    return (
      <main className="loading-shell" data-theme={theme}>
        <Loader2 aria-hidden="true" className="spin" size={28} />
        <span>正在加载学习数据...</span>
      </main>
    );
  }

  if (error) {
    return (
      <main className="loading-shell error-shell" data-theme={theme}>
        <strong>启动失败</strong>
        <span>{error}</span>
      </main>
    );
  }

  const selectedStage = topic ? outline.find((stage) => stage.id === topic.stageId) ?? null : null;

  return (
    <main className="app-shell" data-theme={theme}>
      <Sidebar
        outline={outline}
        selectedTopicId={selectedTopicId}
        onSelectTopic={(id) => void selectTopic(id)}
      />

      <section className="content">
        <header className="topbar">
          <div className="topbar-main">
            <div>
              <span className="eyebrow">Knowledge Workspace</span>
              <h2>{view === 'roadmap' ? '学习路线图' : topic?.name ?? '知识点学习'}</h2>
            </div>
            <div className="topbar-actions">
              <ViewTabs view={view} onChange={setView} />
              <ThemeSettingsMenu
                isOpen={isSettingsOpen}
                theme={theme}
                onToggle={() => setIsSettingsOpen((open) => !open)}
                onChange={(nextTheme) => void updateTheme(nextTheme)}
              />
            </div>
          </div>
          {progress ? <CompactProgress progress={progress} /> : null}
        </header>

        {contentError ? (
          <section className="inline-error" role="alert">
            <strong>操作失败</strong>
            <span>{contentError}</span>
          </section>
        ) : view === 'roadmap' && roadmap ? (
          <RoadmapView
            outline={outline}
            graph={roadmap}
            onSelectTopic={(id) => void selectFromRoadmap(id)}
          />
        ) : topic ? (
          <TopicDetailView
            topic={topic}
            stage={selectedStage}
            onSelectTopic={(id) => void selectTopic(id)}
            onUpdateStatus={(status) => void updateStatus(status)}
            onGateCompleted={() => void refreshAfterGate()}
          />
        ) : (
          <div className="empty-state">暂无可学习专题</div>
        )}
      </section>
    </main>
  );
}

function ThemeSettingsMenu({
  isOpen,
  theme,
  onToggle,
  onChange
}: {
  isOpen: boolean;
  theme: AppTheme;
  onToggle: () => void;
  onChange: (theme: AppTheme) => void;
}) {
  return (
    <div className="settings-menu">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="设置"
        className="icon-button"
        onClick={onToggle}
        type="button"
      >
        <Settings aria-hidden="true" size={16} />
      </button>
      {isOpen ? (
        <div className="settings-popover" role="menu" aria-label="主题设置">
          <span>主题</span>
          <div className="theme-switcher" role="group" aria-label="主题切换">
            <button
              className={theme === 'light' ? 'active' : ''}
              onClick={() => onChange('light')}
              type="button"
            >
              <Sun aria-hidden="true" size={15} />
              浅色
            </button>
            <button
              className={theme === 'dark' ? 'active' : ''}
              onClick={() => onChange('dark')}
              type="button"
            >
              <Moon aria-hidden="true" size={15} />
              深色
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompactProgress({ progress }: { progress: ProgressSummary }) {
  const completedPercent =
    progress.totalTopics === 0 ? 0 : Math.round((progress.completedTopics / progress.totalTopics) * 100);

  return (
    <section className="compact-progress" aria-label="学习进度概览">
      <strong>{completedPercent}%</strong>
      <div className="compact-progress-track" aria-hidden="true">
        <span style={{ width: `${completedPercent}%` }} />
      </div>
      <span>
        {progress.completedTopics}/{progress.totalTopics} 已完成 · {progress.inProgressTopics} 学习中
      </span>
      <progress aria-label="总学习进度" max={100} value={completedPercent} />
    </section>
  );
}
