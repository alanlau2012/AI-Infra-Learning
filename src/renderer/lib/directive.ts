/**
 * Split-before-render directive parser.
 *
 * Recognizes CommonMark-style fenced directives:
 *   :::interactive{component=roofline-chart mode=explore}
 *   :::
 *
 * The directive must occupy whole lines; open and close lines must be on
 * their own (whitespace allowed). The body between open/close is ignored —
 * directives carry no Markdown content for now.
 *
 * `:::` lines inside fenced code blocks (``` or ~~~) are preserved as
 * literal text, never parsed as directives.
 *
 * Unknown component / mode values produce no segment (the directive is
 * dropped with a console warning), so future-unknown directive types
 * fail-soft.
 */

export type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'interactive'; component: string; mode: string };

export type DirectiveAttrs = Partial<Record<'component' | 'mode', string>>;

const ATTR_KEYS: ReadonlyArray<keyof DirectiveAttrs> = ['component', 'mode'];
const ALLOWED_COMPONENTS = new Set<string>(['roofline-chart']);
const ALLOWED_MODES = new Set<string>(['explore', 'gate']);

const OPEN_LINE = /^\s*:::interactive\{([^}]*)\}\s*$/;
const CLOSE_LINE = /^\s*:::\s*$/;

/** Split a Markdown body into a sequence of markdown / interactive segments. */
export function splitByDirective(bodyMd: string): Segment[] {
  const lines = bodyMd.split(/\r?\n/);
  const segments: Segment[] = [];
  let buffer: string[] = [];
  let inFence = false;
  let fenceMarker = '';

  const flushMarkdown = () => {
    if (buffer.length === 0) {
      return;
    }
    const content = buffer.join('\n');
    if (content.trim().length > 0) {
      segments.push({ type: 'markdown', content });
    } else if (segments.length > 0) {
      // preserve a single blank-line boundary by absorbing into prior segment? no — drop.
    }
    buffer = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    // Fence tracking — match opening or closing fence in column 0 (ignore leading
    // spaces ≤3 per CommonMark spec; we keep this conservative).
    const fenceMatch = line.match(/^(\s{0,3})(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = '';
      }
      buffer.push(line);
      continue;
    }
    if (inFence) {
      buffer.push(line);
      continue;
    }

    const openMatch = line.match(OPEN_LINE);
    if (openMatch) {
      // Look ahead for the close line (must occur, otherwise treat the
      // opening line as plain markdown).
      const attrs = parseAttrs(openMatch[1]);
      const closeIdx = findCloseLine(lines, i + 1);
      if (closeIdx === -1) {
        buffer.push(line);
        continue;
      }
      // Valid directive boundary. Flush prior markdown and emit interactive.
      flushMarkdown();
      const seg = makeInteractiveSegment(attrs);
      if (seg) {
        segments.push(seg);
      }
      i = closeIdx;
      continue;
    }

    buffer.push(line);
  }

  flushMarkdown();
  return segments;
}

function findCloseLine(lines: string[], from: number): number {
  let inFence = false;
  let fenceMarker = '';
  for (let i = from; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(/^(\s{0,3})(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) {
      continue;
    }
    if (CLOSE_LINE.test(line)) {
      return i;
    }
    if (OPEN_LINE.test(line)) {
      return -1;
    }
  }
  return -1;
}

function parseAttrs(raw: string): DirectiveAttrs {
  const attrs: DirectiveAttrs = {};
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const eq = token.indexOf('=');
    if (eq === -1) continue;
    const key = token.slice(0, eq) as keyof DirectiveAttrs;
    const value = stripQuotes(token.slice(eq + 1));
    if (!ATTR_KEYS.includes(key)) {
      continue;
    }
    attrs[key] = value;
  }
  return attrs;
}

function stripQuotes(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function makeInteractiveSegment(attrs: DirectiveAttrs): Segment | null {
  const component = attrs.component;
  const mode = attrs.mode;
  if (!component || !mode) {
    console.warn('[directive] missing component or mode attribute', attrs);
    return null;
  }
  if (!ALLOWED_COMPONENTS.has(component)) {
    console.warn('[directive] unknown component', component);
    return null;
  }
  if (!ALLOWED_MODES.has(mode)) {
    console.warn('[directive] unknown mode', mode);
    return null;
  }
  return { type: 'interactive', component, mode };
}
