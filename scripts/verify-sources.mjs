#!/usr/bin/env node
/**
 * verify-sources.mjs
 *
 * 内容质量长效校验脚本，离线手工触发（不进 npm test，避免 CI 依赖外网）。
 *
 * 做两件事：
 *   1. URL 可达性校验：抓 seed_data.json 中所有 topics[].sources[].url，
 *      用 HEAD 请求检查可达性（4xx/5xx/超时报错）。
 *   2. 模型名白名单校验：扫 seed 中 key_points / body_md / real_world_connection
 *      / topic.name，匹配看起来像模型型号的字符串（Qwen / DeepSeek / Mixtral 等），
 *      不在 known-models.json 白名单里的会作为可疑项报警。
 *
 * 用法：
 *   npm run verify:sources                # 默认全部检查
 *   npm run verify:sources -- --no-urls   # 跳过网络检查（仅扫模型名）
 *   npm run verify:sources -- --topic T20 # 仅扫某个 Topic
 *
 * 退出码：
 *   0  全部通过
 *   1  发现可疑模型名或不可达 URL
 *   2  脚本自身错误（seed 缺失、JSON 损坏等）
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, 'resources', 'seed_data.json');
const KNOWN_MODELS_PATH = path.join(ROOT, 'scripts', 'known-models.json');
const HEAD_TIMEOUT_MS = 12_000;

// HuggingFace / arXiv / DOI / 部分 CDN 对无 UA 的 HEAD/GET 不友好，统一带浏览器 UA。
// 必须在 main() 调用前定义 — 否则 main 同步前缀里的第一个 fetch 会 TDZ 求值 options。
const REQUEST_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) verify-sources/1.0'
};

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(`[verify-sources] 脚本异常：${error?.stack ?? error}`);
  process.exit(2);
});

async function main() {
  const seed = readJson(SEED_PATH, 'seed_data.json');
  const knownModels = readJson(KNOWN_MODELS_PATH, 'known-models.json');

  const topics = filterTopics(seed.topics ?? [], args.topic);
  if (topics.length === 0) {
    console.error(`[verify-sources] 没有匹配的 Topic（--topic=${args.topic ?? '*'}）。`);
    process.exit(2);
  }

  let suspiciousModels = 0;
  let unreachableUrls = 0;
  let totalUrls = 0;
  let totalSources = 0;
  let unsupportedNumberClaims = 0;

  console.log(`[verify-sources] 扫描范围：${topics.length} 个 Topic`);

  for (const topic of topics) {
    const found = scanModelMentions(topic, knownModels);
    if (found.length > 0) {
      console.log(`\n[模型名扫描] ${topic.id} ${topic.name}`);
      for (const item of found) {
        const tag = item.known ? 'KNOWN' : 'SUSPICIOUS';
        const where = item.locations.join(', ');
        console.log(`  [${tag}] ${item.name}  (出现位置: ${where})`);
        if (!item.known) {
          suspiciousModels += 1;
        }
      }
    }
  }

  // 规则：含工程数字断言（TFLOPS / TB/s / GB / 压缩比 / 百分比）的 topic
  // 必须至少有一条 high confidence source。否则容易把过时或来路不明的数字
  // 当真理传播。模型名内嵌的数字（如 Qwen3-30B-A3B、910B3）会先被剥离。
  console.log('\n[工程数字断言扫描] 含数字但缺 high-confidence source 的 topic：');
  let topicsFlaggedForNumbers = 0;
  for (const topic of topics) {
    const numberHits = scanFactualNumbers(topic);
    if (numberHits.length === 0) continue;

    const highSources = (topic.sources ?? []).filter((s) => s?.confidence === 'high').length;
    if (highSources >= 1) continue;

    topicsFlaggedForNumbers += 1;
    unsupportedNumberClaims += numberHits.length;
    const sample = numberHits.slice(0, 6).join(', ');
    console.log(`  [FAIL] ${topic.id} ${topic.name}`);
    console.log(`         high-confidence sources: ${highSources} / 总 sources: ${(topic.sources ?? []).length}`);
    console.log(`         发现 ${numberHits.length} 处工程数字断言（前 6 个）：${sample}`);
  }
  if (topicsFlaggedForNumbers === 0) {
    console.log('  [OK] 全部含数字断言的 topic 至少有 1 条 high-confidence source');
  }

  if (!args.skipUrls) {
    console.log('\n[URL 可达性检查] (HEAD, 超时 12s)');
    for (const topic of topics) {
      const sources = Array.isArray(topic.sources) ? topic.sources : [];
      totalSources += sources.length;
      for (const source of sources) {
        if (typeof source?.url !== 'string') {
          continue;
        }
        totalUrls += 1;
        const result = await checkUrl(source.url);
        if (result.ok) {
          console.log(`  [OK ${result.status}] ${topic.id} src=${source.id ?? '?'} ${source.url}`);
        } else {
          unreachableUrls += 1;
          console.log(`  [FAIL ${result.status}] ${topic.id} src=${source.id ?? '?'} ${source.url}  -- ${result.reason}`);
        }
      }
    }
  } else {
    console.log('\n[URL 可达性检查] 已通过 --no-urls 跳过');
  }

  console.log('\n[verify-sources] 汇总：');
  console.log(`  Topic 数: ${topics.length}`);
  console.log(`  含 sources 的条目数: ${totalSources}`);
  if (!args.skipUrls) {
    console.log(`  URL 总数: ${totalUrls}`);
    console.log(`  不可达 URL: ${unreachableUrls}`);
  }
  console.log(`  可疑模型名: ${suspiciousModels}`);
  console.log(`  含数字断言但无 high-confidence source 的 topic: ${topicsFlaggedForNumbers}`);
  console.log(`  其中累计未支撑的数字断言数: ${unsupportedNumberClaims}`);

  const failed = suspiciousModels > 0 || unreachableUrls > 0 || topicsFlaggedForNumbers > 0;
  if (failed) {
    console.error('\n[verify-sources] 发现可疑项，请处理后再次运行。');
    process.exit(1);
  } else {
    console.log('\n[verify-sources] 全部通过。');
  }
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`[verify-sources] 找不到 ${label}：${filePath}`);
    process.exit(2);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[verify-sources] 解析 ${label} 失败：${error?.message ?? error}`);
    process.exit(2);
  }
}

function filterTopics(topics, topicId) {
  if (!topicId) {
    return topics;
  }
  return topics.filter((t) => t?.id === topicId);
}

function scanModelMentions(topic, knownModels) {
  const knownNames = new Set((knownModels.models ?? []).map((m) => m.name));

  /**
   * 模型型号名启发式正则。维护原则：宁可漏报、不要误报，命中后由人工二次确认。
   *  - Qwen 系列：Qwen3 / Qwen3.5 / Qwen3-Next 等 + 参数尺寸（数字 B 可选 -A 数字 B）
   *  - DeepSeek 系列：DeepSeek-V3 / V3.2 / V4 / V4-Flash 等
   *  - Mixtral / Llama / MiniMax / Mistral 主要以 \w+-数字 形式命名
   */
  const patterns = [
    /\bQwen\d+(?:\.\d+)?(?:-Next)?-\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?(?:-[A-Za-z][A-Za-z0-9]*)*\b/g,
    /\bDeepSeek-V\d+(?:\.\d+)?(?:-[A-Za-z][A-Za-z0-9]*)*\b/g,
    /\bMixtral-\d+x\d+B\b/g,
    /\bLlama-?\d+(?:\.\d+)?-\d+B\b/gi,
    /\bMiniMax(?:[\s-]M?\d+(?:\.\d+)?)?\b/g
  ];

  const fields = [
    { name: 'name', value: topic.name ?? '' },
    { name: 'why', value: topic.why ?? '' },
    { name: 'real_world_connection', value: topic.real_world_connection ?? '' },
    { name: 'key_points', value: (topic.key_points ?? []).join('\n') },
    { name: 'body_md', value: stripAssumptionCallouts(topic.body_md ?? '') }
  ];

  const hits = new Map();

  for (const field of fields) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(field.value))) {
        const raw = match[0].trim();
        if (raw.length === 0) continue;
        const entry = hits.get(raw) ?? { name: raw, locations: new Set(), known: knownNames.has(raw) };
        entry.locations.add(field.name);
        hits.set(raw, entry);
      }
    }
  }

  return [...hits.values()].map((e) => ({ ...e, locations: [...e.locations] }));
}

/**
 * 扫描 topic 中的"工程数字断言"——指容易过时、需要权威来源支撑的硬性数字：
 *   - 算力: TFLOPS / GFLOPS / TOPS
 *   - 带宽: TB/s / GB/s / MB/s
 *   - 显存: GB（独立出现）
 *   - 压缩比: N×
 *   - 百分比: N%
 *
 * 扫描原则：
 *   - 先剥离 [!ASSUMPTION] callout（已显式标"假设"，不计入硬断言）
 *   - 先剥离已知模型名 mention（如 Qwen3-30B-A3B，里面的 30B 不算硬断言）
 *   - 仅扫 why / real_world_connection / key_points / body_md
 */
function scanFactualNumbers(topic) {
  const factualPatterns = [
    /\b\d+(?:[.,]\d+)?\s*T?FLOPS\b/g,
    /\b\d+(?:[.,]\d+)?\s*TOPS\b/g,
    /\b\d+(?:[.,]\d+)?\s*(?:T|G|M)B\/s\b/g,
    /\b\d+(?:[.,]\d+)?\s*GB\b/g,
    /\b\d+(?:[.,]\d+)?\s*×/g,
    /\b\d+(?:[.,]\d+)?\s*%/g
  ];

  const modelStripPatterns = [
    /\bQwen\d+(?:\.\d+)?(?:-Next)?-\d+(?:\.\d+)?B(?:-A\d+(?:\.\d+)?B)?(?:-[A-Za-z][A-Za-z0-9]*)*\b/g,
    /\bDeepSeek-V\d+(?:\.\d+)?(?:-[A-Za-z][A-Za-z0-9]*)*\b/g,
    /\bMixtral-\d+x\d+B\b/g,
    /\bLlama-?\d+(?:\.\d+)?-\d+B\b/gi,
    /\bMiniMax(?:[\s-]M?\d+(?:\.\d+)?)?\b/g,
    /\b910B[1234]?\b/g,
    /\bH100\b/g,
    /\bA100\b/g
  ];

  const fields = [
    topic.why ?? '',
    topic.real_world_connection ?? '',
    (topic.key_points ?? []).join('\n'),
    stripAssumptionCallouts(topic.body_md ?? '')
  ];

  let scrubbed = fields.join('\n');
  for (const pattern of modelStripPatterns) {
    pattern.lastIndex = 0;
    scrubbed = scrubbed.replace(pattern, '<MODEL>');
  }

  const hits = [];
  for (const pattern of factualPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(scrubbed))) {
      const value = match[0].trim();
      if (value.length > 0) hits.push(value);
    }
  }
  return hits;
}

function stripAssumptionCallouts(markdown) {
  const kept = [];
  let skipping = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^>\s*\[!ASSUMPTION\]/.test(line)) {
      skipping = true;
      continue;
    }

    if (skipping) {
      if (line.startsWith('>')) {
        continue;
      }
      skipping = false;
    }

    kept.push(line);
  }

  return kept.join('\n');
}

async function checkUrl(url) {
  // 第一步：HEAD（带 UA + 超时）
  const headResult = await tryRequest(url, 'HEAD');
  if (headResult.ok) {
    return headResult;
  }

  // 第二步：HEAD 失败时一律 fallback 到 GET（不少 CDN 对 HEAD 的处理不一致，
  // 405/403/超时/socket 提前关闭都会出现，GET 才是权威判断依据）。
  const getResult = await tryRequest(url, 'GET');
  if (getResult.ok) {
    return getResult;
  }

  return {
    ok: false,
    status: getResult.status,
    reason: `HEAD: ${headResult.reason ?? headResult.status} | GET: ${getResult.reason ?? getResult.status}`
  };
}

async function tryRequest(url, method) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: REQUEST_HEADERS
    });
    clearTimeout(timer);
    if (response.status >= 200 && response.status < 400) {
      return { ok: true, status: response.status };
    }
    return { ok: false, status: response.status, reason: `HTTP ${response.status}` };
  } catch (error) {
    clearTimeout(timer);
    return { ok: false, status: 'ERR', reason: error?.cause?.code ?? error?.message ?? String(error) };
  }
}

function parseArgs(argv) {
  const out = { skipUrls: false, topic: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--no-urls') {
      out.skipUrls = true;
    } else if (a === '--topic') {
      out.topic = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--topic=')) {
      out.topic = a.slice('--topic='.length);
    }
  }
  return out;
}
