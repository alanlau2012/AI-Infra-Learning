import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from 'electron';
import type { SeedData, StudyStatus } from '../shared/types';
import { createLearningStore, type LearningStore } from './learningStore';
import { getProgressPath, getSeedDataPath, getTopicDiagramPath } from './paths';
import {
  getContentSecurityPolicy,
  getSecureWebPreferences,
  isExternalLinkSafeToOpen,
  isValidStudyStatus
} from './security';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

/** 若 ready-to-show 因 GPU/渲染异常未触发，5 s 后强制显示窗口 */
const SHOW_WINDOW_FALLBACK_MS = 5_000;

let mainWindow: BrowserWindow | null = null;
let learningStore: LearningStore | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'learning-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.moveTop();
    void mainWindow.focus();
  });

  app.whenReady().then(() => {
    try {
      const isDevelopment = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      installCsp(isDevelopment);
      installLearningAssetProtocol();
      learningStore = openLearningStore();
      registerIpcHandlers(() => {
        if (!learningStore) {
          throw new Error('Learning store is not initialized');
        }
        return learningStore;
      });
      createWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const hint = app.isPackaged
        ? '请反馈日志文件或重新安装应用。'
        : '请从项目根目录在终端中执行：npm start';
      dialog.showErrorBox('AI Infra Learning 启动失败', `${message}\n\n${hint}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    learningStore = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'AI Infra Learning',
    backgroundColor: '#0f172a',
    webPreferences: getSecureWebPreferences(path.join(__dirname, 'preload.js'))
  });

  const w = mainWindow;

  // 拒绝所有新窗口请求；但若是 http(s) 外链（如 Topic 参考资料），转交系统浏览器打开。
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalLinkSafeToOpen(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  // 阻止渲染层跳转到应用自身 URL 以外的地址
  w.webContents.on('will-navigate', (event, navigationUrl) => {
    const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    const allowed = devUrl
      ? navigationUrl.startsWith(devUrl)
      : new URL(navigationUrl).protocol === 'file:';
    if (!allowed) {
      event.preventDefault();
    }
  });

  w.once('ready-to-show', () => {
    if (w.isDestroyed()) {
      return;
    }
    w.show();
    w.moveTop();
    void w.focus();
  });
  // 若因渲染/GPU 等问题未触发 ready-to-show，仍显示主窗体，避免「进程在跑但无界面」
  setTimeout(() => {
    if (w.isDestroyed() || w.isVisible()) {
      return;
    }
    w.show();
    void w.focus();
  }, SHOW_WINDOW_FALLBACK_MS);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const devServerUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;
    loadDevServerWithRetry(w, devServerUrl);
    w.webContents.once('did-finish-load', () => {
      if (!w.isDestroyed()) {
        w.webContents.openDevTools({ mode: 'right' });
      }
    });
  } else {
    const prodHtmlPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    w.loadFile(prodHtmlPath).catch(() => {
      // 错误通过 did-fail-load 上报，这里吞掉避免 unhandled rejection。
    });
    w.webContents.on('did-fail-load', (_event, _errorCode, errorDescription, _url, isMainFrame) => {
      if (!isMainFrame || w.isDestroyed()) {
        return;
      }
      dialog.showErrorBox(
        'AI Infra Learning 加载失败',
        `渲染页面加载失败：${errorDescription}\n\n请反馈日志文件或重新安装应用。`
      );
    });
  }
}

// Vite 首次启动时会做一次依赖预构建（Re-optimizing dependencies），
// 期间 plugin-vite 会重建 main/preload 并重启 Electron，
// 此时 dev server 端口可能短暂不可用，导致渲染页面加载失败、窗口只剩深蓝背景。
// 这里用 did-fail-load 指数退避重试，直到连上 dev server。
function loadDevServerWithRetry(window: BrowserWindow, url: string) {
  const RETRYABLE_ERROR_CODES = new Set([
    -102, // ERR_CONNECTION_REFUSED
    -101, // ERR_CONNECTION_RESET
    -109, // ERR_ADDRESS_UNREACHABLE
    -118, // ERR_CONNECTION_TIMED_OUT
    -105 // ERR_NAME_NOT_RESOLVED
  ]);
  const MAX_ATTEMPTS = 30;
  let attempts = 0;

  const attemptLoad = () => {
    if (window.isDestroyed()) {
      return;
    }
    attempts += 1;
    window.loadURL(url).catch(() => {
      // 错误会通过 did-fail-load 单独上报，这里吞掉避免 unhandled rejection。
    });
  };

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame) {
      return;
    }
    if (!RETRYABLE_ERROR_CODES.has(errorCode)) {
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      console.error(`[main] 放弃加载 dev server：${validatedUrl}（${errorDescription}）`);
      return;
    }
    const delayMs = Math.min(200 * 2 ** Math.min(attempts - 1, 4), 2000);
    setTimeout(attemptLoad, delayMs);
  });

  attemptLoad();
}

function installLearningAssetProtocol() {
  protocol.handle('learning-asset', (request) => {
    try {
      const assetPath = getTopicDiagramPath(request.url);
      if (!fs.existsSync(assetPath)) {
        return new Response('Learning asset not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(assetPath).toString());
    } catch {
      return new Response('Invalid learning asset URL', { status: 400 });
    }
  });
}

function installCsp(isDevelopment: boolean) {
  const csp = getContentSecurityPolicy(isDevelopment);
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });
}

function openLearningStore() {
  const seedPath = getSeedDataPath();
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedData;
  return createLearningStore({
    seedData,
    progressPath: getProgressPath()
  });
}

function registerIpcHandlers(getStore: () => LearningStore) {
  ipcMain.handle('learning:getOutline', () => getStore().getOutline());
  ipcMain.handle('learning:getProgress', () => getStore().getProgress());
  ipcMain.handle('learning:getTopic', (_event, topicId: unknown) => {
    if (typeof topicId !== 'string') {
      throw new Error('Invalid IPC payload: topicId must be a string');
    }
    return getStore().getTopic(topicId);
  });
  ipcMain.handle('learning:getRoadmapGraph', () => getStore().getRoadmapGraph());
  ipcMain.handle('learning:updateTopicStatus', (_event, topicId: unknown, status: unknown) => {
    if (typeof topicId !== 'string' || typeof status !== 'string') {
      throw new Error('Invalid IPC payload: topicId and status must be strings');
    }
    if (!isValidStudyStatus(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    return getStore().updateTopicStatus(topicId, status as StudyStatus);
  });
}
