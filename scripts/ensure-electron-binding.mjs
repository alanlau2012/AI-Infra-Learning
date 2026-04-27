// 防止 npm test / npm rebuild 之后 better-sqlite3 binding 仍是系统 Node ABI
// 导致 npm start 直接崩在 NODE_MODULE_VERSION 不一致。
//
// 策略：在 prestart 阶段，用 Electron 自带的 Node（ELECTRON_RUN_AS_NODE=1）尝试 require
// better-sqlite3。能加载就跳过；任何失败一律调 @electron/rebuild 重建。
//
// 该探针只在 `npm start` 时跑，CI 的 `npm test` 不会触发，所以本地与 CI 行为不会分叉。
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromHere = createRequire(import.meta.url);

let electronBinary;
try {
  electronBinary = requireFromHere('electron');
} catch (err) {
  console.error('[ensure-binding] 找不到 electron 包，请先执行 npm install。');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

if (typeof electronBinary !== 'string') {
  console.error('[ensure-binding] electron 模块未返回可执行路径，环境异常。');
  process.exit(1);
}

const probeScript =
  "try { require('better-sqlite3'); process.exit(0); }" +
  " catch (e) { process.stderr.write(e && e.message ? e.message : String(e)); process.exit(1); }";

const probe = spawnSync(electronBinary, ['-e', probeScript], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8'
});

if (probe.error) {
  console.error('[ensure-binding] 启动 Electron 探针失败：', probe.error.message);
  process.exit(1);
}

if (probe.status === 0) {
  console.log('[ensure-binding] better-sqlite3 已与 Electron ABI 匹配，跳过 rebuild');
  process.exit(0);
}

const reason = (probe.stderr || '').trim() || `exit code ${probe.status}`;
console.warn(`[ensure-binding] better-sqlite3 与 Electron ABI 不匹配：${reason}`);
console.warn('[ensure-binding] 正在重建 better-sqlite3 ...');

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const rebuild = spawnSync(npxCmd, ['--yes', '@electron/rebuild', '-f', '-w', 'better-sqlite3'], {
  cwd: root,
  stdio: 'inherit'
});

if (rebuild.error) {
  console.error('[ensure-binding] 调用 @electron/rebuild 失败：', rebuild.error.message);
  process.exit(1);
}

if (rebuild.status !== 0) {
  console.error(
    '[ensure-binding] @electron/rebuild 退出码 ' +
      rebuild.status +
      '，请手动执行：npx @electron/rebuild -f -w better-sqlite3'
  );
  process.exit(rebuild.status ?? 1);
}

console.log('[ensure-binding] better-sqlite3 已重建为 Electron ABI');
