import { GitBranch, List } from 'lucide-react';

export type LearningView = 'list' | 'roadmap';

interface Props {
  view: LearningView;
  onChange: (view: LearningView) => void;
}

export default function ViewTabs({ view, onChange }: Props) {
  return (
    <div className="view-tabs" role="tablist" aria-label="视图切换">
      <button
        className={view === 'list' ? 'active' : ''}
        type="button"
        role="tab"
        aria-selected={view === 'list'}
        onClick={() => onChange('list')}
      >
        <List aria-hidden="true" size={14} />
        列表
      </button>
      <button
        className={view === 'roadmap' ? 'active' : ''}
        type="button"
        role="tab"
        aria-selected={view === 'roadmap'}
        onClick={() => onChange('roadmap')}
      >
        <GitBranch aria-hidden="true" size={14} />
        路线图
      </button>
    </div>
  );
}
