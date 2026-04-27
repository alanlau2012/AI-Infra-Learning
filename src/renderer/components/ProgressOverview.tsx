import { Circle, CircleCheck, PlayCircle } from 'lucide-react';
import type { ProgressSummary } from '../../shared/types';

interface Props {
  progress: ProgressSummary;
}

function toPercent(completed: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export default function ProgressOverview({ progress }: Props) {
  const completedPercent = toPercent(progress.completedTopics, progress.totalTopics);
  const currentStageId =
    progress.stageProgress.find((item) => item.completedTopics < item.totalTopics)?.stageId ?? null;

  return (
    <section className="progress-overview" aria-label="学习进度概览">
      <div className="progress-overview-main">
        <div className="progress-overview-copy">
          <span className="progress-kicker">总进度</span>
          <div className="progress-overview-headline">
            <strong>{completedPercent}%</strong>
            <span>
              {progress.completedTopics}/{progress.totalTopics} 已完成
            </span>
          </div>
        </div>

        <dl className="progress-stat-list" aria-label="学习状态统计">
          <div>
            <dt>
              <CircleCheck aria-hidden="true" size={15} />
              已完成
            </dt>
            <dd>{progress.completedTopics}</dd>
          </div>
          <div>
            <dt>
              <PlayCircle aria-hidden="true" size={15} />
              学习中
            </dt>
            <dd>{progress.inProgressTopics}</dd>
          </div>
          <div>
            <dt>
              <Circle aria-hidden="true" size={15} />
              未开始
            </dt>
            <dd>{progress.notStartedTopics}</dd>
          </div>
        </dl>
      </div>

      <progress className="progress-overview-bar" aria-label="总学习进度" max={100} value={completedPercent} />

      <div className="stage-progress-grid" aria-label="阶段进度">
        {progress.stageProgress.map((item) => {
          const stagePercent = toPercent(item.completedTopics, item.totalTopics);
          const isCurrent = item.stageId === currentStageId;
          const isComplete = item.totalTopics > 0 && item.completedTopics === item.totalTopics;

          return (
            <article
              className={`stage-progress-card ${isCurrent ? 'current' : ''} ${
                isComplete ? 'complete' : ''
              }`}
              key={item.stageId}
            >
              <div className="stage-progress-card-top">
                <span className="stage-code">{item.stageId}</span>
                <span className="stage-state">
                  {isComplete ? '已完成' : isCurrent ? '当前阶段' : '待推进'}
                </span>
              </div>
              <div className="stage-progress-card-body">
                <strong>{item.stageName}</strong>
                <span>
                  {item.completedTopics}/{item.totalTopics}
                </span>
              </div>
              <progress aria-label={`阶段 ${item.stageId} 进度`} max={100} value={stagePercent} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
