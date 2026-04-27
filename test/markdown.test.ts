// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/renderer/lib/markdown';

describe('renderMarkdown — XSS sanitization', () => {
  it('escapes raw <script> tags so they never become real script elements', () => {
    const html = renderMarkdown('hello <script>alert(1)</script> world');
    // html: false 已转义；DOMPurify 再过一次确保 DOM 解析仍无 script 节点。
    const dom = new DOMParser().parseFromString(html, 'text/html');
    expect(dom.querySelectorAll('script')).toHaveLength(0);
  });

  it('does not render <img onerror=...> as a real DOM <img>', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const img = dom.querySelector('img');
    // 即便意外渲染出 <img>，也不应保留 onerror。
    if (img) {
      expect(img.getAttribute('onerror')).toBeNull();
    }
  });

  it('never produces an <a href="javascript:..."> from a markdown link', () => {
    const html = renderMarkdown('[click](javascript:alert(1))');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(dom.querySelectorAll('a'));
    for (const a of anchors) {
      const href = a.getAttribute('href') ?? '';
      expect(href.toLowerCase().startsWith('javascript:')).toBe(false);
    }
  });

  it('never produces <iframe> or <object> in the parsed DOM', () => {
    const html = renderMarkdown('<iframe src="https://evil.example"></iframe>\n\n<object data="x"></object>');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    expect(dom.querySelectorAll('iframe')).toHaveLength(0);
    expect(dom.querySelectorAll('object')).toHaveLength(0);
  });

  it('strips data: image src and other non-bundled image URLs', () => {
    const html = renderMarkdown('![x](data:image/png;base64,AAAA)');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const img = dom.querySelector('img');
    if (img) {
      const src = img.getAttribute('src') ?? '';
      expect(src.startsWith('data:')).toBe(false);
    }

    const externalHtml = renderMarkdown('![x](https://example.com/x.png) ![y](file:///tmp/x.svg)');
    const externalDom = new DOMParser().parseFromString(externalHtml, 'text/html');
    for (const image of Array.from(externalDom.querySelectorAll('img'))) {
      expect(image.getAttribute('src')).toBeNull();
    }
  });

  it('keeps safe http(s) and mailto links and forces rel=noopener target=_blank on http(s)', () => {
    const html = renderMarkdown('[a](https://example.com) [b](mailto:x@y.z)');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(dom.querySelectorAll('a'));
    expect(anchors.length).toBe(2);

    const httpAnchor = anchors.find((a) => a.getAttribute('href')?.startsWith('https://'));
    expect(httpAnchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(httpAnchor?.getAttribute('target')).toBe('_blank');

    const mailAnchor = anchors.find((a) => a.getAttribute('href')?.startsWith('mailto:'));
    expect(mailAnchor?.getAttribute('href')).toBe('mailto:x@y.z');
  });
});

describe('renderMarkdown — content rendering', () => {
  it('allows bundled learning-asset topic diagram images only', () => {
    const html = renderMarkdown(
      '![diagram](learning-asset://topic-diagrams/t01-roofline.svg)\n\n![bad](learning-asset://topic-diagrams/../secret.svg)'
    );
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const images = Array.from(dom.querySelectorAll('img'));

    expect(images[0]?.getAttribute('src')).toBe('learning-asset://topic-diagrams/t01-roofline.svg');
    expect(images[1]?.getAttribute('src')).toBeNull();
  });

  it('renders headings, lists, blockquotes and tables', () => {
    const md = [
      '# H1',
      '## H2',
      '',
      '- item 1',
      '- item 2',
      '',
      '> quoted',
      '',
      '| a | b |',
      '|---|---|',
      '| 1 | 2 |'
    ].join('\n');

    const html = renderMarkdown(md);
    expect(html).toMatch(/<h1[^>]*>H1<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>H2<\/h2>/);
    expect(html).toMatch(/<ul>[\s\S]*<li>item 1<\/li>/);
    expect(html).toMatch(/<blockquote>[\s\S]*quoted/);
    expect(html).toMatch(/<table>[\s\S]*<th>a<\/th>/);
  });

  it('highlights ```python``` code blocks via highlight.js', () => {
    const html = renderMarkdown('```python\nprint("hi")\n```');
    expect(html).toMatch(/class="hljs language-python"/);
    expect(html).toMatch(/hljs-(string|built_in|keyword)/);
  });

  it('escapes plain code blocks without a language', () => {
    const html = renderMarkdown('```\n<not html>\n```');
    expect(html).toMatch(/&lt;not html&gt;/);
    expect(html).not.toMatch(/<not html>/);
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('renders inline code', () => {
    const html = renderMarkdown('use `foo` here');
    expect(html).toMatch(/<code>foo<\/code>/);
  });
});
