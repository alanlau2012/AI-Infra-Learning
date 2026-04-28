import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const latestSelectId = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [nextOutline, nextProgress, nextRoadmap] = await Promise.all([
          window.learning.getOutline(),
          window.learning.getProgress(),
          window.learning.getRoadmapGraph()
        ]);
        const firstTopicId = nextOutline[0]?.topics[0]?.id ?? null;
        const firstTopic = firstTopicId ? await window.learning.getTopic(firstTopicId) : null;

        if (!isMounted) {
          return;
        }

        setOutline(nextOutline);
        setProgress(nextProgress);
        setRoadmap(nextRoadmap);
        setSelectedTopicId(firstTopicId);
        setTopic(firstTopic);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : '加载失败');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function selectTopic(topicId: string) {
    const requestId = ++latestSelectId.current;
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

  if (isLoading) {
    return (
      <main className="loading-shell">
        <Loader2 aria-hidden="true" className="spin" size={28} />
        <span>正在加载学习数据...</span>
      </main>
    );
  }

  if (error) {
    return (
      <main className="loading-shell error-shell">
        <strong>启动失败</strong>
        <span>{error}</span>
      </main>
    );
  }

  const selectedStage = topic ? outline.find((stage) => stage.id === topic.stageId) ?? null : null;

  return (
    <main className="app-shell">
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
            <ViewTabs view={view} onChange={setView} />
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
          />
        ) : (
          <div className="empty-state">暂无可学习专题</div>
        )}
      </section>
    </main>
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
