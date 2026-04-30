import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveProgressPath, resolveSeedDataPath, resolveSettingsPath, resolveTopicDiagramPath } from '../src/main/paths';

describe('resource path resolution', () => {
  it('uses project resources in Electron Forge dev mode when app is not packaged', () => {
    const root = path.resolve('D:/repo');

    expect(resolveSeedDataPath({ isPackaged: false, resourcesPath: 'C:/resources', cwd: root })).toBe(
      path.join(root, 'resources', 'seed_data.json')
    );
  });

  it('uses process.resourcesPath for packaged builds', () => {
    expect(resolveSeedDataPath({ isPackaged: true, resourcesPath: 'C:/resources', cwd: 'D:/repo' })).toBe(
      path.join('C:/resources', 'seed_data.json')
    );
  });

  it('stores progress under Electron userData', () => {
    expect(resolveProgressPath('C:/Users/Test/AppData/Roaming/ai-infra-learning')).toBe(
      path.join('C:/Users/Test/AppData/Roaming/ai-infra-learning', 'progress.json')
    );
  });

  it('stores settings under Electron userData', () => {
    expect(resolveSettingsPath('C:/Users/Test/AppData/Roaming/ai-infra-learning')).toBe(
      path.join('C:/Users/Test/AppData/Roaming/ai-infra-learning', 'settings.json')
    );
  });

  it('resolves bundled topic diagrams in dev and packaged builds', () => {
    expect(
      resolveTopicDiagramPath('learning-asset://topic-diagrams/t01-roofline.svg', {
        isPackaged: false,
        resourcesPath: 'C:/resources',
        cwd: 'D:/repo'
      })
    ).toBe(path.join('D:/repo', 'resources', 'topic-diagrams', 't01-roofline.svg'));

    expect(
      resolveTopicDiagramPath('learning-asset://topic-diagrams/t01-roofline.svg', {
        isPackaged: true,
        resourcesPath: 'C:/resources',
        cwd: 'D:/repo'
      })
    ).toBe(path.join('C:/resources', 'topic-diagrams', 't01-roofline.svg'));
  });

  it('rejects topic diagram URLs outside the read-only asset whitelist', () => {
    const options = { isPackaged: false, resourcesPath: 'C:/resources', cwd: 'D:/repo' };

    expect(() => resolveTopicDiagramPath('https://example.com/t01.svg', options)).toThrow(/Invalid|Unsupported/);
    expect(() => resolveTopicDiagramPath('learning-asset://other/t01.svg', options)).toThrow(/Invalid|Unsupported/);
    expect(() => resolveTopicDiagramPath('learning-asset://topic-diagrams/../secret.svg', options)).toThrow(/filename/);
    expect(() => resolveTopicDiagramPath('learning-asset://topic-diagrams/t01.png', options)).toThrow(/filename/);
  });
});
