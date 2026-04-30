import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings, AppTheme } from '../shared/types';
import { isValidAppTheme } from './security';

const SETTINGS_VERSION = 1;
const DEFAULT_SETTINGS: AppSettings = { theme: 'light' };

interface SettingsFile {
  version: number;
  theme: AppTheme;
}

export interface SettingsStore {
  getSettings: () => AppSettings;
  updateTheme: (theme: string) => AppSettings;
}

export function createSettingsStore(settingsPath: string): SettingsStore {
  let settings = loadSettings(settingsPath);

  return {
    getSettings: () => ({ ...settings }),
    updateTheme: (theme: string) => {
      if (!isValidAppTheme(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
      }

      settings = { theme };
      saveSettings(settingsPath, settings);
      return { ...settings };
    }
  };
}

function loadSettings(settingsPath: string): AppSettings {
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Partial<SettingsFile>;
    if (parsed.version !== SETTINGS_VERSION || !isValidAppTheme(parsed.theme)) {
      return { ...DEFAULT_SETTINGS };
    }

    return { theme: parsed.theme };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settingsPath: string, settings: AppSettings) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  const payload: SettingsFile = {
    version: SETTINGS_VERSION,
    theme: settings.theme
  };
  fs.writeFileSync(settingsPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
