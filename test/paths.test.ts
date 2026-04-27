import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveProgressPath, resolveSeedDataPath } from '../src/main/paths';

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
});
