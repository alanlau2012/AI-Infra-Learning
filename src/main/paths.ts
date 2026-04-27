import path from 'node:path';
import { app } from 'electron';

export function getProgressPath() {
  return resolveProgressPath(app.getPath('userData'));
}

function getDevResourceRoot() {
  // 开发模式下不用 process.cwd()，避免从错误目录启动时读不到 resources 导致启动失败且不弹窗。
  return app.getAppPath();
}

export function getSeedDataPath() {
  return resolveSeedDataPath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    cwd: getDevResourceRoot()
  });
}

export function resolveSeedDataPath(options: {
  isPackaged: boolean;
  resourcesPath: string;
  cwd: string;
}) {
  if (!options.isPackaged) {
    return path.resolve(options.cwd, 'resources', 'seed_data.json');
  }

  return path.join(options.resourcesPath, 'seed_data.json');
}

export function resolveProgressPath(userDataPath: string) {
  return path.join(userDataPath, 'progress.json');
}
