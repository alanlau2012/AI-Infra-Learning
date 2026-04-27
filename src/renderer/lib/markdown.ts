import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import cpp from 'highlight.js/lib/languages/cpp';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import MarkdownIt from 'markdown-it';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="hljs language-${lang}">${
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
        // fall through
      }
    }
    return `<pre class="hljs"><code class="hljs">${md.utils.escapeHtml(code)}</code></pre>`;
  }
});

const ALLOWED_LINK_URI = /^(?:https?|mailto):/i;
const LEARNING_ASSET_IMAGE = /^learning-asset:\/\/topic-diagrams\/[a-z0-9-]+\.svg$/i;
const CALLOUT_LABELS: Record<string, string> = {
  ASCEND: '昇腾落点',
  NOTE: '提示',
  WARNING: '注意'
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // 拒绝任何非白名单 URL scheme（包含 javascript:、data: 等），同时给所有外链强制 noopener。
  if ('href' in node) {
    const href = (node as HTMLAnchorElement).getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('/') && !ALLOWED_LINK_URI.test(href)) {
      node.removeAttribute('href');
    } else if (href && /^https?:/i.test(href)) {
      (node as HTMLAnchorElement).setAttribute('rel', 'noopener noreferrer');
      (node as HTMLAnchorElement).setAttribute('target', '_blank');
    }
  }

  // Only bundled topic diagrams are allowed as Markdown images.
  if (node instanceof HTMLImageElement) {
    const src = node.getAttribute('src') ?? '';
    if (src && !LEARNING_ASSET_IMAGE.test(src)) {
      node.removeAttribute('src');
    }
  }
});

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
  FORBID_ATTR: ['style', 'srcset', 'autoplay', 'sandbox', 'formaction'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|learning-asset:\/\/topic-diagrams\/[a-z0-9-]+\.svg|[#/])/i,
  RETURN_TRUSTED_TYPE: false
};

export function renderMarkdown(input: string): string {
  if (!input) {
    return '';
  }

  const rawHtml = md.render(input);
  const sanitized = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as unknown as string;
  return enhanceCallouts(sanitized);
}

function enhanceCallouts(html: string): string {
  if (typeof document === 'undefined') {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  for (const quote of Array.from(template.content.querySelectorAll('blockquote'))) {
    const firstParagraph = quote.querySelector('p');
    const rawText = firstParagraph?.textContent ?? '';
    const match = rawText.match(/^\[!(ASCEND|NOTE|WARNING)\]\s*([\s\S]*)$/);
    if (!firstParagraph || !match) {
      continue;
    }

    const type = match[1].toLowerCase();
    const label = CALLOUT_LABELS[match[1]] ?? match[1];
    const content = match[2].trim();
    const labelNode = document.createElement('strong');
    labelNode.textContent = label;

    firstParagraph.textContent = content;
    firstParagraph.prepend(document.createTextNode(' '));
    firstParagraph.prepend(labelNode);
    quote.classList.add('callout', `callout-${type}`);
  }

  return template.innerHTML;
}
