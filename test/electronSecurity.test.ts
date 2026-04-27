import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getContentSecurityPolicy, getSecureWebPreferences, isValidStudyStatus } from '../src/main/security';

describe('Electron security defaults', () => {
  it('uses strict browser webPreferences for renderer isolation', () => {
    expect(getSecureWebPreferences('preload.js')).toEqual({
      preload: 'preload.js',
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    });
  });

  it('allows Vite HMR only in development CSP', () => {
    const devCsp = getContentSecurityPolicy(true);

    expect(devCsp).toContain("'unsafe-inline'");
    expect(devCsp).toContain("'unsafe-eval'");
    expect(devCsp).toContain('ws://localhost:*');
  });

  it('uses a strict production CSP without inline or eval allowances', () => {
    const prodCsp = getContentSecurityPolicy(false);

    expect(prodCsp).toBe(
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: learning-asset:; connect-src 'self'"
    );
    expect(prodCsp).not.toContain("'unsafe-inline'");
    expect(prodCsp).not.toContain("'unsafe-eval'");
  });

  it('keeps index.html free of static CSP so Electron can install the environment-specific policy', () => {
    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

    expect(indexHtml).not.toContain('http-equiv="Content-Security-Policy"');
  });

  it('validates study statuses before IPC writes', () => {
    expect(isValidStudyStatus('not_started')).toBe(true);
    expect(isValidStudyStatus('in_progress')).toBe(true);
    expect(isValidStudyStatus('completed')).toBe(true);
    expect(isValidStudyStatus('done')).toBe(false);
  });
});
