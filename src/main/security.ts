import type { StudyStatus } from '../shared/types';

export const VALID_STATUSES = new Set<StudyStatus>(['not_started', 'in_progress', 'completed']);

export function getSecureWebPreferences(preload: string) {
  return {
    preload,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true
  };
}

export function getContentSecurityPolicy(isDevelopment: boolean) {
  if (isDevelopment) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: learning-asset:",
      "connect-src 'self' http://localhost:* ws://localhost:*"
    ].join('; ');
  }

  return "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: learning-asset:; connect-src 'self'";
}

export function isValidStudyStatus(status: string): status is StudyStatus {
  return VALID_STATUSES.has(status as StudyStatus);
}
