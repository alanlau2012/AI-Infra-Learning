import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

interface Props {
  markdown: string;
}

export default function MarkdownContent({ markdown }: Props) {
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);
  return (
    <div
      className="markdown-body"
      // sanitized via DOMPurify in renderMarkdown
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
