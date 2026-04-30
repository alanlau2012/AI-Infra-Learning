import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSettingsStore } from '../src/main/settingsStore';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-infra-settings-test-'));
  tempDirs.push(dir);
  return dir;
}

function makeSettingsPath() {
  return path.join(makeTempDir(), 'settings.json');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('settings store', () => {
  it('uses light as the default theme when settings.json does not exist', () => {
    const store = createSettingsStore(makeSettingsPath());

    expect(store.getSettings()).toEqual({ theme: 'light' });
  });

  it('persists the selected theme across store reinitialization', () => {
    const settingsPath = makeSettingsPath();
    const store = createSettingsStore(settingsPath);

    const updated = store.updateTheme('dark');
    const reopened = createSettingsStore(settingsPath);

    expect(updated).toEqual({ theme: 'dark' });
    expect(reopened.getSettings()).toEqual({ theme: 'dark' });
    expect(JSON.parse(fs.readFileSync(settingsPath, 'utf8'))).toEqual({
      version: 1,
      theme: 'dark'
    });
  });

  it('falls back to light when settings.json is corrupt or carries an invalid theme', () => {
    const corruptPath = makeSettingsPath();
    fs.mkdirSync(path.dirname(corruptPath), { recursive: true });
    fs.writeFileSync(corruptPath, '{ broken json', 'utf8');

    expect(createSettingsStore(corruptPath).getSettings()).toEqual({ theme: 'light' });

    const invalidPath = makeSettingsPath();
    fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
    fs.writeFileSync(invalidPath, JSON.stringify({ version: 1, theme: 'system' }), 'utf8');

    expect(createSettingsStore(invalidPath).getSettings()).toEqual({ theme: 'light' });
  });

  it('rejects invalid theme updates', () => {
    const store = createSettingsStore(makeSettingsPath());

    expect(() => store.updateTheme('system')).toThrow(/Invalid theme/);
  });
});
