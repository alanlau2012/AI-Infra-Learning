#!/usr/bin/env node
/**
 * Electron 实窗 UI 冒烟：启动 dev app（UI_SMOKE=1 开启 CDP），逐项检查交互区与导航。
 * 用法：node ./scripts/ui-smoke.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CDP_URL = 'http://127.0.0.1:9333';
const STARTUP_TIMEOUT_MS = 180_000;

const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'resources', 'seed_data.json'), 'utf8'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForHttpOk(url, timeoutMs) {
  const started = Date.now();
  return (async () => {
    while (Date.now() - started < timeoutMs) {
      try {
        const res = await fetch(url);
        if (res.ok || (res.status >= 200 && res.status < 400)) {
          return true;
        }
      } catch {
        // retry
      }
      await sleep(500);
    }
    throw new Error(`Timeout waiting for ${url}`);
  })();
}

function killExistingElectron() {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/F', '/IM', 'electron.exe'], { stdio: 'ignore' });
  } else {
    spawn('pkill', ['-f', 'electron'], { stdio: 'ignore' });
  }
}

function startApp() {
  if (process.platform === 'win32') {
    const child = spawn('cmd.exe', ['/c', 'start', '/min', 'cmd', '/c', 'npm start'], {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: 'ignore',
      detached: true,
      windowsHide: true
    });
    child.unref();
    return { child };
  }

  const child = spawn('npm', ['start'], {
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true,
    stdio: 'ignore',
    detached: true
  });
  child.unref();
  return { child };
}

async function waitForAppReady(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await waitForHttpOk(`${CDP_URL}/json/version`, 2000);
      return;
    } catch {
      await sleep(1500);
    }
  }
  throw new Error('Electron app/CDP did not become ready');
}

async function getPage(browser) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      const url = page.url();
      if (url.startsWith('http://') || url.startsWith('file://')) {
        return page;
      }
    }
  }
  throw new Error('No renderer page found in CDP targets');
}

function assertNoHorizontalOverflow(page, selector, label) {
  return page.locator(selector).evaluateAll((nodes) =>
    nodes.map((node) => {
      const el = node;
      return {
        overflow: el.scrollWidth > el.clientWidth + 2,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    })
  ).then((results) => {
    for (const result of results) {
      if (result.overflow) {
        throw new Error(`${label}: horizontal overflow ${result.scrollWidth}px > ${result.clientWidth}px`);
      }
    }
  });
}

async function runChecks(page) {
  const failures = [];
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`  [OK] ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`  [FAIL] ${name}: ${message}`);
    }
  };

  await page.setViewportSize({ width: 1280, height: 800 });

  await check('首屏加载完成', async () => {
    await page.getByRole('heading', { name: 'AI Infra Learning 2026' }).waitFor({ timeout: 30_000 });
    await page.getByText('Knowledge Workspace').waitFor();
  });

  await check('进度概览可见', async () => {
    await page.getByLabel('学习进度概览').waitFor();
  });

  for (const topic of seed.topics) {
    const demo = topic.interactive_demo;
    if (!demo) {
      throw new Error(`${topic.id} missing interactive_demo`);
    }

    await check(`${topic.id} 专题切换与交互区`, async () => {
      await page.locator('.topic-button', { hasText: topic.id }).click();
      await page.getByRole('heading', { level: 3, name: topic.name }).waitFor();
      const region = page.getByRole('region', { name: `${demo.title} 交互教学` });
      await region.waitFor();
      await assertNoHorizontalOverflow(page, '.interactive-lesson', `${topic.id} interactive-lesson`);
    });

    await check(`${topic.id} step 切换同步 explainer`, async () => {
      const region = page.getByRole('region', { name: `${demo.title} 交互教学` });
      if (demo.steps.length < 2) {
        return;
      }
      const second = demo.steps[1];
      await region.getByRole('tab', { name: new RegExp(second.label) }).click();
      await region.locator('.interactive-explainer').getByText(second.explanation).waitFor();
    });

    if (topic.id === 'T03') {
      await check('T03 step0 stalled DOM = 24', async () => {
        const region = page.getByRole('region', { name: `${demo.title} 交互教学` });
        await region.getByRole('tab', { name: /静态 batch/ }).click();
        const count = await region.locator('.batch-cell.stalled').count();
        if (count !== 24) {
          throw new Error(`expected 24 stalled cells, got ${count}`);
        }
      });

      await check('T03 step1 stalled DOM = 0', async () => {
        const region = page.getByRole('region', { name: `${demo.title} 交互教学` });
        await region.getByRole('tab', { name: /连续补位/ }).click();
        const count = await region.locator('.batch-cell.stalled').count();
        if (count !== 0) {
          throw new Error(`expected 0 stalled cells, got ${count}`);
        }
      });
    }

    if (topic.id === 'T02') {
      await check('T02 负载滑块更新 KV 显存', async () => {
        const region = page.getByRole('region', { name: `${demo.title} 交互教学` });
        const before = await region.locator('.metric-grid strong').nth(1).innerText();
        await region.getByLabel('负载').fill('95');
        await sleep(200);
        const after = await region.locator('.metric-grid strong').nth(1).innerText();
        if (before === after) {
          throw new Error(`kv metric unchanged: ${before}`);
        }
      });
    }
  }

  await check('路线图视图', async () => {
    await page.getByRole('tab', { name: '路线图' }).click();
    await page.getByTestId('roadmap-root').waitFor();
  });

  await check('返回列表视图', async () => {
    await page.getByRole('tab', { name: '列表' }).click();
    await page.getByRole('heading', { level: 3 }).waitFor();
  });

  await check('深色主题切换', async () => {
    await page.getByRole('button', { name: '设置' }).click();
    await page.getByRole('button', { name: '深色' }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', undefined, {
      timeout: 5000
    });
    await page.getByRole('button', { name: '设置' }).click();
    await page.getByRole('button', { name: '浅色' }).click();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', undefined, {
      timeout: 5000
    });
  });

  return failures;
}

async function cdpReady(timeoutMs) {
  await waitForHttpOk(`${CDP_URL}/json/version`, timeoutMs);
}

async function main() {
  const connectOnly = process.env.UI_SMOKE_CONNECT === '1';
  let appProcess = null;

  if (!connectOnly) {
    console.log('[ui-smoke] 清理已有 Electron 进程…');
    killExistingElectron();
    await sleep(1500);
    console.log('[ui-smoke] 启动 npm start…');
    ({ child: appProcess } = startApp());
  } else {
    console.log('[ui-smoke] 连接模式：使用已运行的 Electron dev app…');
  }

  let browser;
  try {
    if (!connectOnly) {
      console.log('[ui-smoke] 等待 Electron CDP…');
      await waitForAppReady(STARTUP_TIMEOUT_MS);
    }
    await cdpReady(connectOnly ? 15_000 : STARTUP_TIMEOUT_MS);
    console.log('[ui-smoke] CDP 就绪');

    const { chromium } = await import('playwright');
    browser = await chromium.connectOverCDP(CDP_URL);
    const page = await getPage(browser);

    console.log('[ui-smoke] 开始 UI 检查 (1280×800)…');
    const failures = await runChecks(page);

    if (failures.length > 0) {
      console.error('\n[ui-smoke] 失败项：');
      for (const failure of failures) {
        console.error(`  - ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\n[ui-smoke] 全部 UI 检查通过。');
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    if (appProcess) {
      appProcess.kill('SIGTERM');
      await sleep(1000);
      killExistingElectron();
    }
  }
}

main().catch((error) => {
  console.error('[ui-smoke] 脚本异常:', error);
  process.exitCode = 1;
});
