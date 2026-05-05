import { BookOpen } from 'lucide-react';
import type { StageWithTopics } from '../../shared/types';

interface Props {
  outline: StageWithTopics[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
}

export default function Sidebar({ outline, selectedTopicId, onSelectTopic }: Props) {
  return (
    <aside className="sidebar" aria-label="学习专题导航">
      <div className="brand">
        <BookOpen aria-hidden="true" size={24} />
        <div>
          <h1>Enterprise Agent Platform Skills</h1>
          <p>企业 Agent 平台能力学习版</p>
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
                  onClick={() => onSelectTopic(item.id)}
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
  );
}
