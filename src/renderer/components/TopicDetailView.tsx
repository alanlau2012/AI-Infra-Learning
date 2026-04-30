import {
  BookOpenCheck,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  ListChecks,
  PlayCircle,
  Star,
  Timer
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import type { SourceConfidence, StageWithTopics, StudyStatus, TopicDetail } from '../../shared/types';
import { extractMarkdownHeadings } from '../lib/markdown';
import MarkdownContent from './MarkdownContent';

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

const confidenceLabels: Record<SourceConfidence, string> = {
  high: '官方来源',
  medium: '社区/二手',
  low: '示例假设'
};

interface Props {
  topic: TopicDetail;
  stage: StageWithTopics | null;
  onUpdateStatus: (status: StudyStatus) => void;
  onSelectTopic: (topicId: string) => void;
  onGateCompleted?: () => void;
}

export default function TopicDetailView({ topic, stage, onUpdateStatus, onSelectTopic, onGateCompleted }: Props) {
  const headings = useMemo(
    () => (topic.bodyMd ? extractMarkdownHeadings(topic.bodyMd).filter((heading) => heading.level >= 2) : []),
    [topic.bodyMd]
  );
  const stageTopicIndex = stage?.topics.findIndex((item) => item.id === topic.id) ?? -1;
  const stagePosition = stageTopicIndex >= 0 && stage ? `${stageTopicIndex + 1}/${stage.topics.length}` : topic.id;

  return (
    <div className="learning-workspace">
      <article className="topic-detail">
        <section className="topic-hero">
          <div className="topic-hero-top">
            <div>
              <span className="topic-kicker">
                {stage?.id ?? topic.stageId} · {stage?.name ?? '学习专题'} · {topic.id}
              </span>
              <h3>{topic.name}</h3>
            </div>
            <div className={`status-pill ${topic.status}`}>
              {statusIcons[topic.status]}
              <span>{statusLabels[topic.status]}</span>
            </div>
          </div>
          <p>{topic.why ?? '该专题正在补充学习目标。'}</p>
          <div className="topic-meta-grid" aria-label="专题元信息">
            <div>
              <span>预计学习</span>
              <strong>
                <Timer aria-hidden="true" size={15} />
                {topic.studyTimeMinutes} 分钟
              </strong>
            </div>
            <div>
              <span>难度</span>
              <strong>
                <Star aria-hidden="true" size={15} />
                {difficultyLabel(topic.difficulty)}
              </strong>
            </div>
            <div>
              <span>学习位置</span>
              <strong>
                <Clock3 aria-hidden="true" size={15} />
                {stage?.name ?? topic.stageId} · {stagePosition}
              </strong>
            </div>
          </div>
        </section>

        <section className="topic-insight-grid" aria-label="专题摘要">
          <div className="insight-panel">
            <h4>学习目标</h4>
            <p>{topic.why ?? '理解该专题的核心判断和工程价值。'}</p>
          </div>
          <div className="insight-panel key-panel">
            <h4>关键判断</h4>
            <ol>
              {topic.keyPoints.slice(0, 4).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          </div>
          <div className="insight-panel">
            <h4>工程落点</h4>
            <p>{topic.realWorldConnection ?? '该专题正在补充实战关联。'}</p>
          </div>
        </section>

        <section className="detail-section detail-body-section" aria-label="详细内容">
          {topic.bodyMd ? (
            <MarkdownContent markdown={topic.bodyMd} topicId={topic.id} onGateCompleted={onGateCompleted} />
          ) : (
            <p className="body-fallback">正文内容待补充。</p>
          )}
        </section>
      </article>

      <aside className="learning-panel" aria-label="学习面板">
        <PanelCard title="本节目录" meta={headings.length ? `${headings.length} 段` : '待补充'}>
          {headings.length ? (
            <nav className="toc-list" aria-label="本节目录">
              {headings.map((heading) => (
                <a className={`toc-level-${heading.level}`} href={`#${heading.id}`} key={heading.id}>
                  {heading.title}
                </a>
              ))}
            </nav>
          ) : (
            <p className="panel-empty">暂无章节目录</p>
          )}
        </PanelCard>

        <PanelCard title="学习状态" meta="本地保存">
          <div className="status-actions" aria-label="学习状态">
            {(Object.keys(statusLabels) as StudyStatus[]).map((status) => (
              <button
                className={topic.status === status ? 'active' : ''}
                key={status}
                onClick={() => onUpdateStatus(status)}
                type="button"
              >
                {statusIcons[status]}
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="前置知识" meta={`${topic.prerequisites.length}`}>
          {topic.prerequisites.length ? (
            <div className="prerequisite-list">
              {topic.prerequisites.map((item) => (
                <button key={item.id} onClick={() => onSelectTopic(item.id)} type="button">
                  <BookOpenCheck aria-hidden="true" size={14} />
                  <span>{item.id}</span>
                  <strong>{item.name}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="panel-empty">无需前置知识</p>
          )}
        </PanelCard>

        <PanelCard title="可信来源" meta={topic.sources.length ? `${topic.sources.length}` : '暂无'}>
          {topic.sources.length ? (
            <ul className="source-list">
              {topic.sources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} rel="noopener noreferrer" target="_blank">
                    <span>{source.title}</span>
                    <ExternalLink aria-hidden="true" size={13} />
                  </a>
                  <div>
                    <span>{source.publisher}</span>
                    <span>{confidenceLabels[source.confidence]}</span>
                    <span>{source.last_verified}</span>
                  </div>
                  {source.covers.length ? (
                    <p>{source.covers.slice(0, 2).join('；')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">暂无来源信息</p>
          )}
        </PanelCard>

        <PanelCard title="学习检查点" meta="自测">
          <ul className="checkpoint-list">
            {buildCheckpoints(topic).map((item) => (
              <li key={item}>
                <ListChecks aria-hidden="true" size={14} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      </aside>
    </div>
  );
}

function PanelCard({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="learning-panel-card">
      <div className="learning-panel-head">
        <h4>{title}</h4>
        <span>{meta}</span>
      </div>
      <div className="learning-panel-body">{children}</div>
    </section>
  );
}

function difficultyLabel(difficulty: number) {
  const normalized = Math.min(Math.max(Math.round(difficulty), 1), 3);
  return `${'★'.repeat(normalized)}${'☆'.repeat(3 - normalized)} · ${normalized}/3`;
}

function buildCheckpoints(topic: TopicDetail) {
  const checkpoints = topic.keyPoints.slice(0, 3).map((point) => `能否解释：${point}`);
  if (topic.realWorldConnection) {
    checkpoints.push('能否把本节结论映射到 GTS 生产场景？');
  }

  return checkpoints.length ? checkpoints : ['能否说清本节的核心判断？'];
}
