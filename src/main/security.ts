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

/**
 * 判断一个外部链接是否允许通过 shell.openExternal 转交系统浏览器。
 * 仅放行 http / https 两种协议；其他（file / javascript / data / 自定义协议）一律拒绝。
 *
 * 必须在 setWindowOpenHandler 与 will-navigate 中同时使用，避免渲染层通过任意协议触发主机行为。
 */
export function isExternalLinkSafeToOpen(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}
