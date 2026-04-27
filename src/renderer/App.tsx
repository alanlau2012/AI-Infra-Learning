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
import ProgressOverview from './components/ProgressOverview';
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
    try {
      const nextTopic = await window.learning.getTopic(topicId);
      if (latestSelectId.current === requestId) {
        setTopic(nextTopic);
      }
    } catch (nextError) {
      if (latestSelectId.current === requestId) {
        setError(nextError instanceof Error ? nextError.message : '加载专题失败');
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
      setError(nextError instanceof Error ? nextError.message : '更新状态失败');
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
              <span className="eyebrow">Phase 1 MVP</span>
              <h2>知识点学习</h2>
            </div>
            <ViewTabs view={view} onChange={setView} />
          </div>
          {progress ? <ProgressOverview progress={progress} /> : null}
        </header>

        {view === 'roadmap' && roadmap ? (
          <RoadmapView
            outline={outline}
            graph={roadmap}
            onSelectTopic={(id) => void selectFromRoadmap(id)}
          />
        ) : topic ? (
          <TopicDetailView topic={topic} onUpdateStatus={(status) => void updateStatus(status)} />
        ) : (
          <div className="empty-state">暂无可学习专题</div>
        )}
      </section>
    </main>
  );
}
