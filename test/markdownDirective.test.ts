import { describe, expect, it } from 'vitest';
import { splitByDirective } from '../src/renderer/lib/directive';

describe('splitByDirective', () => {
  it('splits markdown around an interactive directive', () => {
    const md = [
      '# Title',
      '',
      'Some intro text.',
      '',
      ':::interactive{component=roofline-chart mode=explore}',
      ':::',
      '',
      'Closing text.'
    ].join('\n');

    const segments = splitByDirective(md);
    expect(segments).toEqual([
      { type: 'markdown', content: ['# Title', '', 'Some intro text.', ''].join('\n') },
      { type: 'interactive', component: 'roofline-chart', mode: 'explore' },
      { type: 'markdown', content: ['', 'Closing text.'].join('\n') }
    ]);
  });

  it('ignores directive-shaped text inside fenced code blocks', () => {
    const md = [
      '```',
      ':::interactive{component=roofline-chart mode=gate}',
      ':::',
      '```'
    ].join('\n');
    const segments = splitByDirective(md);
    expect(segments).toEqual([{ type: 'markdown', content: md }]);
  });

  it('drops directives with unknown component or mode', () => {
    const md = [
      'before',
      ':::interactive{component=unknown mode=explore}',
      ':::',
      'after'
    ].join('\n');
    const warn = console.warn;
    console.warn = () => {};
    try {
      const segments = splitByDirective(md);
      expect(segments).toEqual([
        { type: 'markdown', content: 'before' },
        { type: 'markdown', content: 'after' }
      ]);
    } finally {
      console.warn = warn;
    }
  });
});
