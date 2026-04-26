import { BookOpen, CheckCircle2, Circle, Clock3, Loader2, PlayCircle, Star, Timer } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ProgressSummary, StageWithTopics, StudyStatus, TopicDetail } from '../shared/types';

const statusLabels: Record<StudyStatus, string> = {
  not_started: '未学习',
  in_progress: '学习中',
  completed: '已完成'
};

const statusIcons: Record<StudyStatus, ReactElement> = {
  not_started: <Circle aria-hidden="true" size={16} />,
  in_progress: <PlayCircle aria-hidden="true" size={16} />,
  completed: <CheckCircle2 aria-hidden="true" size={16} />
};

export default function App() {
  const [outline, setOutline] = useState<StageWithTopics[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [nextOutline, nextProgress] = await Promise.all([
          window.learning.getOutline(),
          window.learning.getProgress()
        ]);
        const firstTopicId = nextOutline[0]?.topics[0]?.id ?? null;
        const firstTopic = firstTopicId ? await window.learning.getTopic(firstTopicId) : null;

        if (!isMounted) {
          return;
        }

        setOutline(nextOutline);
        setProgress(nextProgress);
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
    setSelectedTopicId(topicId);
    setTopic(await window.learning.getTopic(topicId));
  }

  async function updateStatus(status: StudyStatus) {
    if (!topic) {
      return;
    }

    const nextTopic = await window.learning.updateTopicStatus(topic.id, status);
    const [nextOutline, nextProgress] = await Promise.all([
      window.learning.getOutline(),
      window.learning.getProgress()
    ]);

    setTopic(nextTopic);
    setOutline(nextOutline);
    setProgress(nextProgress);
  }

  const completedPercent = useMemo(() => {
    if (!progress || progress.totalTopics === 0) {
      return 0;
    }

    return Math.round((progress.completedTopics / progress.totalTopics) * 100);
  }, [progress]);

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
      <aside className="sidebar" aria-label="学习专题导航">
        <div className="brand">
          <BookOpen aria-hidden="true" size={24} />
          <div>
            <h1>AI Infra 学习系统</h1>
            <p>Windows 本地学习版</p>
          </div>
        </div>

        <nav className="stage-list">
          {outline.map((stage) => (
            <section className="stage-section" key={stage.id}>
              <div className="stage-title">
                <span>{stage.id}</span>
                <strong>{stage.name}</strong>
              </div>
              <div className="topic-list">
                {stage.topics.map((item) => (
                  <button
                    className={`topic-button ${selectedTopicId === item.id ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => void selectTopic(item.id)}
                    type="button"
                  >
                    <span className={`status-dot ${item.status}`} />
                    <span className="topic-id">{item.id}</span>
                    <span className="topic-name">{item.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Phase 1 MVP</span>
            <h2>知识点学习</h2>
          </div>
          {progress ? (
            <div className="progress-box">
              <span>进度 {progress.completedTopics}/{progress.totalTopics}</span>
              <progress aria-label="总学习进度" max={100} value={completedPercent} />
            </div>
          ) : null}
        </header>

        {topic ? (
          <article className="topic-detail">
            <div className="topic-heading">
              <div>
                <span className="topic-code">{topic.id}</span>
                <h3>{topic.name}</h3>
              </div>
              <div className={`status-pill ${topic.status}`}>
                {statusIcons[topic.status]}
                <span>{statusLabels[topic.status]}</span>
              </div>
            </div>

            <div className="meta-row">
              <span>
                <Timer aria-hidden="true" size={16} />
                {topic.studyTimeMinutes} 分钟
              </span>
              <span>
                <Star aria-hidden="true" size={16} />
                难度 {topic.difficulty}/3
              </span>
              <span>
                <Clock3 aria-hidden="true" size={16} />
                前置 {topic.prerequisites.length ? topic.prerequisites.map((item) => item.id).join(', ') : '无'}
              </span>
            </div>

            <section className="detail-section">
              <h4>为什么重要</h4>
              <p>{topic.why}</p>
            </section>

            <section className="detail-section">
              <h4>关键知识点</h4>
              <ol className="key-points">
                {topic.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            </section>

            <section className="detail-section">
              <h4>实战关联</h4>
              <p>{topic.realWorldConnection}</p>
            </section>

            <div className="status-actions" aria-label="学习状态">
              {(Object.keys(statusLabels) as StudyStatus[]).map((status) => (
                <button
                  className={topic.status === status ? 'active' : ''}
                  key={status}
                  onClick={() => void updateStatus(status)}
                  type="button"
                >
                  {statusIcons[status]}
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </article>
        ) : (
          <div className="empty-state">暂无可学习专题</div>
        )}
      </section>
    </main>
  );
}
