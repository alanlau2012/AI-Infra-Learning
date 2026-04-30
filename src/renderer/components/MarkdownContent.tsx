import { useMemo } from 'react';
import { splitByDirective } from '../lib/directive';
import { renderMarkdown } from '../lib/markdown';
import RooflineChart from './interactive/RooflineChart';
import './interactive/RooflineChart/roofline.css';

interface Props {
  markdown: string;
  /** topicId is required when the markdown may contain interactive directives,
   * since interactive components fetch their own data via IPC keyed by topic. */
  topicId?: string;
  /** Fired when an interactive gate completes (passes). Parent can refresh
   * outline / progress / topic detail to reflect the auto-set completed status. */
  onGateCompleted?: () => void;
}

export default function MarkdownContent({ markdown, topicId, onGateCompleted }: Props) {
  const segments = useMemo(() => splitByDirective(markdown), [markdown]);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'markdown') {
          return <MarkdownSegment key={i} content={seg.content} />;
        }
        if (seg.component === 'roofline-chart') {
          if (!topicId) {
            return null;
          }
          if (seg.mode !== 'explore' && seg.mode !== 'gate') {
            return null;
          }
          return (
            <RooflineChart
              key={i}
              topicId={topicId}
              mode={seg.mode}
              onGateCompleted={onGateCompleted}
            />
          );
        }
        return null;
      })}
    </>
  );
}

function MarkdownSegment({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="markdown-body"
      // sanitized via DOMPurify in renderMarkdown
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
