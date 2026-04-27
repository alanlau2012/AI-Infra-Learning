// pretest 守卫：vitest 跑在系统 Node 上，要求 better-sqlite3 binding 也是系统 Node ABI。
// 用 createRequire 直接 try 加载：成功表示已匹配（跳过），失败抛 NODE_MODULE_VERSION 才 rebuild。
//
// 该脚本不影响 npm start（npm start 由 prestart 守卫切回 Electron ABI）。
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromHere = createRequire(import.meta.url);

let needsRebuild = false;
try {
  requireFromHere('better-sqlite3');
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/NODE_MODULE_VERSION/.test(message)) {
    needsRebuild = true;
  } else {
    console.error('[ensure-binding] better-sqlite3 加载失败（非 ABI 问题）：', message);
    process.exit(1);
  }
}

if (!needsRebuild) {
  console.log('[ensure-binding] better-sqlite3 已与系统 Node ABI 匹配，跳过 rebuild');
  process.exit(0);
}

console.warn('[ensure-binding] better-sqlite3 与系统 Node ABI 不匹配，正在重建...');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rebuild = spawnSync(npmCmd, ['rebuild', 'better-sqlite3'], {
  cwd: root,
  stdio: 'inherit'
});

if (rebuild.error) {
  console.error('[ensure-binding] 调用 npm rebuild 失败：', rebuild.error.message);
  process.exit(1);
}

if (rebuild.status !== 0) {
  console.error('[ensure-binding] npm rebuild 退出码 ' + rebuild.status);
  process.exit(rebuild.status ?? 1);
}

console.log('[ensure-binding] better-sqlite3 已重建为系统 Node ABI');
