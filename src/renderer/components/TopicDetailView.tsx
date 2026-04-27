import { CheckCircle2, Circle, Clock3, PlayCircle, Star, Timer } from 'lucide-react';
import type { ReactElement } from 'react';
import type { StudyStatus, TopicDetail } from '../../shared/types';
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

interface Props {
  topic: TopicDetail;
  onUpdateStatus: (status: StudyStatus) => void;
}

export default function TopicDetailView({ topic, onUpdateStatus }: Props) {
  return (
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

      <section className="topic-summary-grid" aria-label="专题摘要">
        <div className="summary-card">
          <h4>为什么重要</h4>
          <p>{topic.why ?? '该专题正在补充摘要。'}</p>
        </div>
        <div className="summary-card">
          <h4>关键知识点</h4>
          <ol className="key-points">
            {topic.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </div>
        <div className="summary-card">
          <h4>实战关联</h4>
          <p>{topic.realWorldConnection ?? '该专题正在补充实战关联。'}</p>
        </div>
      </section>

      <section className="detail-section detail-body-section">
        <h4>详细内容</h4>
        {topic.bodyMd ? <MarkdownContent markdown={topic.bodyMd} /> : <p>正文内容待补充。</p>}
      </section>

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
    </article>
  );
}
