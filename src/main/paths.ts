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

export function getTopicDiagramPath(assetUrl: string) {
  return resolveTopicDiagramPath(assetUrl, {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    cwd: getDevResourceRoot()
  });
}

export function resolveTopicDiagramPath(
  assetUrl: string,
  options: {
    isPackaged: boolean;
    resourcesPath: string;
    cwd: string;
  }
) {
  if (!/^learning-asset:\/\/topic-diagrams\/[a-z0-9-]+\.svg$/i.test(assetUrl)) {
    throw new Error('Invalid topic diagram filename');
  }

  let url: URL;
  try {
    url = new URL(assetUrl);
  } catch {
    throw new Error('Invalid learning asset URL');
  }

  if (url.protocol !== 'learning-asset:' || url.hostname !== 'topic-diagrams') {
    throw new Error('Unsupported learning asset URL');
  }

  const filename = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!/^[a-z0-9-]+\.svg$/.test(filename)) {
    throw new Error('Invalid topic diagram filename');
  }

  const resourceRoot = options.isPackaged
    ? options.resourcesPath
    : path.resolve(options.cwd, 'resources');
  const diagramRoot = path.join(resourceRoot, 'topic-diagrams');
  const resolvedPath = path.join(diagramRoot, filename);
  const relativePath = path.relative(diagramRoot, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Topic diagram path escapes resource directory');
  }

  return resolvedPath;
}

export function resolveProgressPath(userDataPath: string) {
  return path.join(userDataPath, 'progress.json');
}
