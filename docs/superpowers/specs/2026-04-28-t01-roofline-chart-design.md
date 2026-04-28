# T01 RooflineChart 交互组件 + 判断力 Gate · 设计

**日期**：2026-04-28
**作者**：Alan Lau（PM）+ Claude（设计协作）
**状态**：待实施
**关联**：CLAUDE.md 产品定位红线（5 个核心 topic 必须含交互组件，否则回退电子书路线）

---

## 1. 背景与目标

### 1.1 产品定位与现状

CLAUDE.md 自定义本 App 为"交互式学习产品（非电子书）"，并把"5 个核心 topic（T01 / T02 / T06 / T09 / T10）必须含交互组件"作为 PR 拒收红线。**当前现状**：21 个 topic 的"交互"完成度为 0/5，App 实际上是一本制作精良的电子书。

T01 是核心 topic 中位列第一、依赖最少、概念最基础的那个——是验证整条"交互式学习"路线的天然起点。CLAUDE.md 第一段已明确写下回退条件："如果 Phase 2 的 RooflineChart gate 测试失败（5 人盲测中能凭直觉判 bound 的少于 3 人），整体路线回退到'高保真电子书'，砍 Roadmap/状态机/buildCheckpoints。"

本 spec 即为该 gate 的设计。

### 1.2 目标

- **首要**：让没读过 T01 正文的学员，通过"切硬件 + 切场景"的探索 + 5 题判 bound 检验，建立 Roofline / compute-bound / memory-bound 的直觉
- **次要**：建立 Markdown 正文挂载 React 交互组件的通用机制，给后续 T02 / T06 / T09 / T10 复用
- **次要**：建立"判断力 gate"作为 topic 完成态的客观标准——"已完成"不再是主观点击，而是 gate 通过后自动设置

### 1.3 验收 / Kill 标准

- **通过条件**：5 人盲测（被试未读过 T01 正文），≥ 3 人通过 gate（5 题中答对 ≥ 4 题）
- **失败处置**：删除 RooflineChart 分支，T01 回退静态 SVG，本设计文档保留作为复盘材料；CLAUDE.md 中"交互式学习产品"定位需要重新讨论

## 2. Non-goals（明确不做）

| 项目 | 原因 |
|---|---|
| T02 / T06 / T09 / T10 的交互组件 | 架构通用，但每个组件是独立 brainstorm + spec |
| 题库 AI 自动生成 | 题目质量是 gate 价值上限，必须人工校稿 |
| in_progress 中间态持久化（答到一半的状态） | MVP 简化，复杂度回报低 |
| 跨设备同步 / 答题历史详情页 | Phase 3+ 范围 |
| 复习提醒 / spaced repetition | 独立 spec，不在本轮 |
| 团队学习榜 / 答题分布 | 需要后端，Phase 3+ |
| 元认知 confidence slider | 独立 spec，不在本轮 |
| 修改其他 20 个 topic 的静态 SVG | 各自的产品决策，不搭便车 |

## 3. 架构总览

```
seed_data.json              T01.gate 新字段（hardwarePresets / scenarios / attemptConfig）
  ↓
main 进程
  learningStore.ts          getTopicGate / startGateAttempt / checkSingleAnswer / finalizeAttempt
  main.ts                   ipcMain.handle 注册四个新 IPC
  preload.ts                window.learning.{getTopicGate, startGateAttempt, checkSingleAnswer, finalizeAttempt}
  ↓ IPC
renderer
  markdown.ts               markdown-it 自定义 directive plugin
  MarkdownContent.tsx       按 directive 切段，每段独立 React 树
  components/interactive/RooflineChart/
    index.tsx               外壳 + mode 切换
    ChartCanvas.tsx         手写 SVG（log-log 轴 + 屋脊 + 工作点）
    ExplorePanel.tsx        阅读模式
    GatePanel.tsx           gate 模式 + 状态机
    roofline.math.ts        纯计算（独立单测）
  ↓
progress.json (v2)         topicGate 字段持久化
```

**技术选型**：
- 图表：手写 SVG + `d3-scale`（仅数学子包，~5KB，仅取 `scaleLog`）。不引入 recharts / d3 完整版
- Markdown：沿用 `markdown-it` + `DOMPurify` + `highlight.js` 三件套，不替换为 react-markdown
- 状态：React 本地 state，无需新增状态管理库
- 持久化：沿用 `progress.json`，version bump v1 → v2

## 4. 组件设计

### 4.1 图表骨架（两 mode 共用）

| 元素 | 规格 |
|---|---|
| X 轴 | Arithmetic Intensity，log scale，范围 0.1 → 1000 FLOPs/Byte |
| Y 轴 | Performance，log scale，范围 1 → 1000 TFLOPS |
| 主硬件屋脊线 | 实线，颜色由 `hardwarePresets[i].color` 指定 |
| 对比硬件屋脊线 | 虚线（`dashed`），用户可关闭对比 |
| 拐点（ridge） | 屋脊弯折处明确画圆点 + `AI*=数值` 文字标注 |
| 工作点 | 实心圆 + 投影到两轴的虚线参考 + 一句话标签（`场景名 · AI=X · bound 结论`）|
| 背景 | log 主刻度网格，浅灰 |

数学：
```
ridge AI* = peakTflops / bandwidthTBs       // FLOPs/Byte
perf(ai)  = min(peakTflops, bandwidthTBs * ai)
bound     = ai < ridge ? "memory" : "compute"
```

`d3-scale.scaleLog()` 把数学坐标映射到 SVG 像素坐标。

### 4.2 阅读模式（Explore）

挂载位置：T01 body_md 中段，替换原 `learning-asset://topic-diagrams/t01-roofline.svg`。

UI：
- 三个下拉：主硬件 / 对比硬件（含"关闭对比"选项）/ 场景
- 工作点始终可见，参数变化时平滑动画到新位置
- 标签实时更新："工作点 AI=1.5，远低于 H100 拐点 295 → memory-bound"

交互：纯前端，无 IPC（hardwarePresets 和 exploreScenarios 在 `getTopicGate()` 时一次性载入）。

### 4.3 Gate 模式（Gate）

挂载位置：T01 body_md 末尾追加的 `## 判断力检验` 章节。

UI 层级：5 个状态（详见 §6 状态机）。每个状态的视觉差异：

| 状态 | 主视觉 |
|---|---|
| `not_attempted` | 入口卡：标题、规则说明（5/4 通过、自动 completed）、`[开始检验]` 按钮 |
| `in_progress` | 题面框（场景描述+硬件）、Compute / Memory 双选按钮、底部进度条 N/5。**图：硬件屋脊可见，工作点隐藏** |
| `result` | 摘要：`X/5` + 五题汇总条 ✓✓✗✓✓ + 可展开每题详情 |
| `passed` | 折叠态："✓ 已通过 (4/5, 2026-04-28) [重测]" |
| `failed` | "上次成绩 3/5 [再次检验]"，附错题摘要 |

点"开始检验"后：调 `startGateAttempt(topicId)` 取回 5 道 `GateQuestion`（不含 ai、不含答案）。

每题答完后：
1. 调 `checkSingleAnswer(topicId, questionId, answer)` 取回 `{correct, correctAnswer, explanation, operatingPoint}`
2. **工作点出现 + 移到 operatingPoint.ai 位置**
3. 反馈框：绿色 ✓ / 红色 ✗ + explanation 文本
4. 显示 "下一题" 按钮（最后一题改为 "查看结果"）

第 5 题完成后：
1. 调 `finalizeAttempt(topicId, [{questionId, answer}, ...])`
2. 写入 `progress.json.topicGate.T01`
3. 若 `correctCount >= 4`，main 自动把 `topicStatus.T01` 设为 `'completed'`
4. renderer 重新拉 `getProgress` 同步 sidebar / 右栏状态

## 5. 数据 Schema

### 5.1 seed_data.json — T01 新增 `gate` 字段

```jsonc
{
  "id": "T01",
  // ...existing fields
  "gate": {
    "componentId": "roofline-chart",
    "hardwarePresets": [
      {
        "id": "h100-sxm5-dense",
        "name": "H100 SXM5 (dense)",
        "peakTflops": 989,
        "bandwidthTBs": 3.35,
        "color": "#2c7be5",
        "lineStyle": "solid",
        "isDefault": true
      },
      {
        "id": "ascend-910b3",
        "name": "Ascend 910B3",
        "peakTflops": 313,
        "bandwidthTBs": 1.6,
        "color": "#e6622f",
        "lineStyle": "dashed",
        "isComparisonDefault": true
      },
      {
        "id": "ascend-910b1",
        "name": "Ascend 910B1",
        "peakTflops": 363,
        "bandwidthTBs": 1.6,
        "color": "#c2410c",
        "lineStyle": "solid"
      }
    ],
    "scenarios": [
      {
        "id": "s1",
        "name": "Llama-70B decode bs=1",
        "ai": 1.4,
        "category": "decode",
        "tags": ["dense", "memory-bound-clear"],
        "correctAnswer": "memory",
        "explanation": "decode bs=1 每读 1 字节权重只算约 1 FLOP，AI≈1.4 远低于 H100 (295) 和 910B3 (196) 拐点。无论硬件，都是显著 memory-bound。"
      }
      // ≥ 12 道，详细要求见 §5.2
    ],
    "attemptConfig": {
      "questionsPerAttempt": 5,
      "passingThreshold": 4,
      "samplingRules": {
        "minBoundaryQuestions": 1,
        "minCrossHardwareQuestions": 1
      }
    }
  }
}
```

### 5.2 题库要求（≥ 12 道，人工校稿）

题库覆盖矩阵（每道题至少落入两个标签）：

| 维度 | 必含的子类（≥1 道） |
|---|---|
| 阶段 | prefill / decode |
| batch | bs=1 / bs=8 / bs=64+ |
| 硬件结论 | 跨硬件相同（H100 和 910B 都 memory）/ 跨硬件不同（H100 compute、910B memory） |
| 边界 | AI / ridge ∈ [0.7, 1.4]（接近拐点的边界 case，至少 2 道）|
| 误判易点 | 至少 1 道"prefill 看似 compute 但实际 memory"|

每题的 `correctAnswer` 由作者计算 AI 后判定，`explanation` 必须给出"AI 数值 + 拐点对照 + 一句话理由"。

### 5.3 progress.json v2

```jsonc
{
  "version": 2,
  "topicStatus": { "T01": "completed" },
  "topicGate": {
    "T01": {
      "status": "passed",
      "lastAttempt": {
        "correctCount": 4,
        "total": 5,
        "completedAt": "2026-04-28T10:23:00Z"
      },
      "attempts": 2
    }
  }
}
```

**v1 → v2 自动迁移**：检测到 `version: 1` → 加 `topicGate: {}` → 写回时 `version: 2`。坏数据回退到默认值（`topicGate: {}`）并保留原 topicStatus。

### 5.4 shared/types.ts 新增

```typescript
export type GateStatus = 'not_attempted' | 'passed' | 'failed';

export interface HardwarePreset {
  id: string;
  name: string;
  peakTflops: number;
  bandwidthTBs: number;
  color: string;
  lineStyle?: 'solid' | 'dashed';
  isDefault?: boolean;
  isComparisonDefault?: boolean;
}

// renderer 拿到的题面：去掉 correctAnswer / explanation / ai
// ai 不暴露——题面阶段工作点应不可见，揭示后由 SingleAnswerResult.operatingPoint 提供
export interface GateQuestion {
  id: string;
  name: string;
  hardwareId: string;            // 题目指定的硬件（必须，渲染屋脊用）
  category: 'prefill' | 'decode' | 'mixed';
  tags: string[];
}

// explore 模式用的场景（含 ai，工作点全程可见）
export interface ExploreScenario {
  id: string;
  name: string;
  ai: number;
  category: 'prefill' | 'decode' | 'mixed';
  tags: string[];
}

// 单题揭示
export interface SingleAnswerResult {
  questionId: string;
  correct: boolean;
  correctAnswer: 'compute' | 'memory';
  explanation: string;
  operatingPoint: { ai: number; perfTflops: number };
}

// 收尾结果
export interface GateAttemptResult {
  passed: boolean;
  correctCount: number;
  total: number;
}

export interface TopicGate {
  componentId: 'roofline-chart';
  hardwarePresets: HardwarePreset[];
  exploreScenarios: ExploreScenario[];   // explore 模式用，含 ai
  attemptConfig: { questionsPerAttempt: number; passingThreshold: number };
  status: GateStatus;
  lastAttempt: { correctCount: number; total: number; completedAt: string } | null;
  attempts: number;
}
```

### 5.5 IPC 新增

| 方法 | 入参 | 返回 | 副作用 |
|---|---|---|---|
| `getTopicGate(topicId)` | `string` | `TopicGate \| null` | **纯读取**，无副作用。返回 hardwarePresets / exploreScenarios / status / lastAttempt / attempts |
| `startGateAttempt(topicId)` | `string` | `GateQuestion[]`（5 道题面，**不含 ai 和 answer**） | 按 samplingRules 抽样；`attempts++` 写入 progress.json |
| `checkSingleAnswer(topicId, questionId, answer)` | `string`, `string`, `'compute'\|'memory'` | `SingleAnswerResult`（含 operatingPoint 的 ai） | 无（只揭示，不写入）|
| `finalizeAttempt(topicId, answers)` | `string`, `Array<{questionId, answer}>` | `GateAttemptResult` | 写 `progress.json.topicGate.lastAttempt + status`；通过则升 `topicStatus` |

**入参校验**：
- topicId 必须存在且其 seed 有 `gate` 字段，否则抛错
- questionId 必须属于该 topic 的 scenarios 集合
- answer ∈ {'compute', 'memory'}
- finalizeAttempt 的 answers.length 必须等于 attemptConfig.questionsPerAttempt
- 所有 questionId 在 answers 中必须不重复

**安全**：
- 题库的 `correctAnswer` 和 `explanation` 字段绝不出现在 `getTopicGate` 的返回中——renderer 不能从 IPC 提前看答案
- main 进程在 `checkSingleAnswer` / `finalizeAttempt` 时按 questionId 查 seed，私有信息保留在 main

### 5.6 现有 IPC 调整

**`updateTopicStatus(topicId, status)` 防绕过**：
- 若 `status === 'completed'` 且该 topic 有 `gate` 配置 且 `topicGate[topicId].status !== 'passed'` → 拒绝（抛错）
- 通过 gate 自动设置 completed 时，main 内部直接写 progress.json，不走 `updateTopicStatus`，所以不被拒
- 若该 topic 无 gate 配置，行为不变

## 6. 状态机

5 个状态 + 7 条转移：

```
                  ┌─[开始检验]→┐
                  │            ↓
        ① not_attempted  ─→ ② in_progress ─[第5题答完]→ ③ result
                                 ↑                          │
                                 │                          ├─[≥4]→ ④ passed
                                 │                          └─[<4]→ ⑤ failed
                  ┌─[再次检验]──┘                              │
                  └─[重测]─────────────────────────────────────┴─⑤←─┘
                                                                ↑
                                                          ④─[重测]┘
```

| From | To | Trigger | 副作用 |
|---|---|---|---|
| ① | ② | 点"开始检验" | `startGateAttempt` 抽 5 题；attempts++ 写盘 |
| ② | ② | 每题答完点"下一题" | `checkSingleAnswer` 揭示当题；renderer 内部累积答案 |
| ② | ③ | 第 5 题答完 | `finalizeAttempt`；写 progress.json |
| ③ | ④ | correctCount ≥ 4 | main 自动 `topicStatus = 'completed'`；renderer 拉 `getProgress` 刷新 |
| ③ | ⑤ | correctCount < 4 | topicStatus 维持 in_progress |
| ⑤ | ② | 点"再次检验" | `startGateAttempt` 重抽 5 题；attempts++ |
| ④ | ② | 点"重测" | `startGateAttempt` 重抽 5 题；attempts++。**注意**：finalizeAttempt 后 status 不会回退到 failed，无论新结果如何 status 保持 passed（仅更新 lastAttempt）|

**状态来源**：每次进入 T01 详情，`getTopicGate` 返回当前 status。renderer 据此渲染初始视图。

**②（in_progress）非持久化**：刷新 / 切 topic / 关 App → 中间答题状态丢失，下次进 T01 看到 ① 或 ⑤（取决于 lastAttempt）。

## 7. Markdown Directive 集成

### 7.1 Directive 语法

CommonMark 风格 fenced directive：

```markdown
:::interactive{component=roofline-chart mode=explore}
:::

:::interactive{component=roofline-chart mode=gate}
:::
```

### 7.2 markdown-it 插件实现要点

文件：`src/renderer/lib/markdown.ts`（在现有渲染管道中加一个 plugin）。

- 识别 `:::interactive{key=value ...}` 开行 + `:::` 闭行
- 仅当 key 在 `['component', 'mode']` 白名单内才采纳；其它 key 静默忽略（不报错以免影响普通 `:::` 块）
- value 白名单：
  - `component ∈ {'roofline-chart'}`（未来加 T02 / T06 等扩展）
  - `mode ∈ {'explore', 'gate'}`
- 产出 HTML：`<div data-interactive="<component>" data-mode="<mode>"></div>`
- 不识别的 component / mode → 输出空 div + console warning

### 7.3 DOMPurify 配置调整

`src/renderer/lib/markdown.ts` 的 DOMPurify 配置：
- `ADD_DATA_URI_TAGS`: 不变
- 新增 hook：在 `afterSanitizeAttributes` 中，仅保留 `data-interactive` / `data-mode`，且其值必须在白名单内，否则剥离
- 其它 `data-*` 属性的现有处理不变（继续被剥离）

测试用例必须覆盖：
- 合法 directive 通过
- `<div data-interactive="evil" data-mode="x">` 攻击 → 属性被剥离
- 嵌入 `<script>` / `javascript:` URL → 仍被 sanitize

### 7.4 MarkdownContent.tsx 渲染

新逻辑（替换现有 `dangerouslySetInnerHTML` 单段方案）：

```typescript
function renderBody(bodyMd: string, topicId: string) {
  const segments = splitByDirective(bodyMd);
  // 切段：directive 行整段成为 'interactive' segment，其余为 'markdown' segment
  return segments.map((seg, i) => {
    if (seg.type === 'markdown') {
      return <div
        key={i}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(seg.content) }}
      />;
    }
    if (seg.component === 'roofline-chart') {
      return <RooflineChart key={i} topicId={topicId} mode={seg.mode} />;
    }
    return null; // 未来扩展
  });
}
```

`splitByDirective` 是一个独立的纯函数（regex-based），独立单测覆盖。

## 8. 安全考量

延续 CLAUDE.md 的安全基线，无新放开：

| 项 | 处置 |
|---|---|
| `markdown-it` `html: false` | 不变 |
| DOMPurify | 仅 hook 加 data-interactive / data-mode 白名单，其它策略不变 |
| CSP | 不动。所有交互都是 React DOM，无 inline script、无 eval |
| `contextIsolation` / `sandbox` / `nodeIntegration` | 不变 |
| 依赖审查 | `d3-scale` 是纯 JS 数学包，无 eval、无 fetch |
| 题库答案保护 | `correctAnswer` / `explanation` / 题面 `ai` 留在 main；renderer IPC 拿到的 `GateQuestion` 不含 ai 不含答案；`updateTopicStatus` 加 gate 校验防绕过 |

**反作弊定位（明示边界）**：

本设计的 gate 是**直觉验证工具**，不是反作弊系统。已知的"作弊"路径：
- 学员可以在 explore 模式查看每个 `ExploreScenario` 的工作点位置，等到 gate 题问到同名场景时凭记忆给答案
- 学员可以打开 DevTools 翻 Vue/React 组件 props 看抽样的 questionId 列表
- 5 个 hardwarePresets 的算力和带宽是公开数据，理论上学员可手算 ridge AI*

这些路径的存在是**有意**的——能凭这些手段答对题的学员，事实上已经掌握了"AI 与 ridge 比较"这个概念，gate 的目的就达到了。真正的验证是 §10 的盲测：5 名被试在受控环境下 5 分钟探索 + 当场作答，没有时间也没有动力做这种迂回。

## 9. 测试策略

| 层 | 文件 | 用例数 | 关键覆盖 |
|---|---|---|---|
| 纯函数 | `test/rooflineMath.test.ts`（新） | ~12 | AI/perf 数学、log scale 像素映射、bound 判定（含 AI==ridge 边界）|
| learningStore.gate | `test/learningStore.gate.test.ts`（新） | ~12 | `getTopicGate` 是纯读取（不改 progress.json）；`startGateAttempt` 抽样 + attempts++；`GateQuestion` 不含 `ai` 不含 `correctAnswer`；`checkSingleAnswer` 校分；`finalizeAttempt` 写盘 + 通过自动 completed；samplingRules 满足（≥1 边界 + ≥1 跨硬件）；非法 topicId / questionId / answer 拒绝 |
| 进度迁移 | `test/learningStore.migration.test.ts`（新） | ~3 | v1 → v2；v2 直通；坏数据回退默认 |
| markdown directive | `test/markdownDirective.test.ts`（新） | ~9 | directive → data 属性正确；非白名单值剥离；XSS 不漏；**code block 内的 directive 不被解析**（fenced code block 应原样输出） |
| DOMPurify 配置 | `test/markdown.test.ts`（扩展） | +3 | data-interactive/data-mode 白名单；其它 data-* 仍剥离 |
| Electron 安全 | `test/electronSecurity.test.ts`（扩展） | +2 | IPC 入参校验；renderer 拿到的 questions 不含答案 |
| renderer 集成 | `test/renderer.test.tsx`（扩展） | +3 | T01 加载显示 explore 占位；点击"开始检验"切到 gate 占位；通过后右栏自动激活 |

**jsdom 限制**：ChartCanvas 的 SVG 视觉渲染不在 jsdom 测，只测纯计算输入输出。完整答题端到端联动靠手测清单。

### 手测清单（Electron 实窗）

打包前必跑：

- [ ] T01 中段看到 RooflineChart 替换原静态 SVG
- [ ] explore 模式：切硬件 / 切场景 → 工作点平滑动画 + 标签更新
- [ ] explore 模式：对比硬件可关闭
- [ ] T01 末尾"判断力检验"区块；右栏"已完成"按钮 disabled + tooltip
- [ ] 点"开始检验" → 第 1 题，工作点不可见（屋脊可见）
- [ ] 答对 → 工作点出现 + 绿色反馈 + "下一题"
- [ ] 答错 → 工作点出现 + 红色反馈 + 解释文本
- [ ] 5 题答完 → 摘要屏（汇总条 + 可展开）
- [ ] 4/5 → "✓ 已通过" + topicStatus 自动 completed + sidebar 更新
- [ ] 3/5 → "再次检验" 可点 → 重抽题
- [ ] 重进 T01 → "✓ 已通过 (4/5, 日期) [重测]"
- [ ] 重测 2/5 → status 仍 passed
- [ ] 切 topic 再回 T01 → in_progress 中间态丢失
- [ ] DevTools console 无报错；CSP 不被违反

## 10. 盲测方法（验收 Gate）

**目的**：CLAUDE.md 写明的回退判定。

**被试**：5 名 GTS 同事，未读过 T01 正文。

**流程**：
1. 提供 ~3 分钟极简文字介绍（"判断 LLM 推理是 compute / memory bound 的工具"），不解释 Roofline 公式
2. explore 模式自由探索 5 分钟
3. 进入 gate，作答

**判定**：
- 通过判 = 5 题中 ≥ 4 题答对（与 gate 阈值一致）
- 5 人中 ≥ 3 人通过 → **路线成立**，推全部 5 个核心 topic
- 5 人中 < 3 人通过 → **路线失败**，执行 §11 回退方案

**数据采集**：每被试记录 答题对错 / 完成时长 / 口头反馈（卡在哪），用于后续 4 个核心 topic 设计。

**时机**：在 T01 RooflineChart + 题库 12 道完成校稿、Electron 实窗手测通过后立刻做。**不是先合并再盲测**——盲测失败需要 revert 整个分支。

## 11. 回退方案

盲测失败时按顺序执行：

1. `git revert` 本设计实施分支的所有 commit
2. 恢复 `resources/topic-diagrams/t01-roofline.svg`
3. 删除：本 spec 引入的 RooflineChart 组件、markdown directive plugin、`gate` IPC、progress.json v2 字段（保留 v1 兼容）
4. 保留题库 JSON 与本 spec 文档作为复盘材料
5. 在 CLAUDE.md 中把"产品定位"段落标记为待重新讨论；不再以"5 个核心 topic 必须含交互组件"为 PR 拒收标准

## 12. 实施风险与权衡

| 风险 | 缓解 |
|---|---|
| 题库质量是 gate 价值上限——AI 出题质量必然不够 | 题库人工校稿，作为实施计划中独立的、由人完成的 task |
| Markdown directive 是新机制，可能与现有 markdown.test.ts 用例冲突 | 测试矩阵覆盖；现有用例不动，仅在不识别 directive 路径上扩展 |
| jsdom 不能渲染 SVG，组件集成测受限 | 同 React Flow 的处理方式：纯计算单测 + 实窗手测，不强求覆盖率 |
| 盲测样本只有 5 人，统计置信度低 | 用 ≥3/5 而非 ≥3/10——CLAUDE.md 已采用此口径，本 spec 不变 |
| 5 个核心 topic 后续依赖本轮架构，但本轮架构未必适配所有 5 个 | directive 设计预留了 component 字段；如果 T02 / T06 / T09 / T10 中任何一个的交互形态从本机制溢出，重新评估 directive 协议而非将就 |

## 13. 文件清单

**新建**：
- `src/renderer/components/interactive/RooflineChart/index.tsx`
- `src/renderer/components/interactive/RooflineChart/ChartCanvas.tsx`
- `src/renderer/components/interactive/RooflineChart/ExplorePanel.tsx`
- `src/renderer/components/interactive/RooflineChart/GatePanel.tsx`
- `src/renderer/components/interactive/RooflineChart/roofline.math.ts`
- `src/renderer/components/interactive/RooflineChart/roofline.css`
- `test/rooflineMath.test.ts`
- `test/learningStore.gate.test.ts`
- `test/learningStore.migration.test.ts`
- `test/markdownDirective.test.ts`

**修改**：
- `resources/seed_data.json`（T01 加 `gate` 字段；body_md 中 SVG 替换为 directive；末尾追加判断力检验段）
- `src/shared/types.ts`（新类型）
- `src/main/learningStore.ts`（gate 函数 + progress 迁移）
- `src/main/main.ts`（IPC 注册 + `updateTopicStatus` gate 校验）
- `src/main/preload.ts`（暴露三个新方法）
- `src/renderer/lib/markdown.ts`（directive plugin + DOMPurify hook）
- `src/renderer/components/MarkdownContent.tsx`（按 directive 切段）
- `src/renderer/components/TopicDetailView.tsx`（右栏"已完成"按钮 gate 联动）
- `src/renderer/styles.css`（gate 状态样式）
- `test/markdown.test.ts`（DOMPurify 扩展）
- `test/electronSecurity.test.ts`（IPC 校验扩展）
- `test/renderer.test.tsx`（gate 流程扩展）
- `package.json`（加 `d3-scale` 依赖）

**删除**：
- `resources/topic-diagrams/t01-roofline.svg`

## 14. 后续跟进（不在本轮）

- T02 KV Cache 交互组件 + 显存计算器（独立 spec）
- T06 vLLM continuous batching 时序动画（独立 spec）
- T09 MTP 接受率 sweep（独立 spec）
- T10 量化 trade-off slider（独立 spec）
- 复习提醒 / spaced repetition（独立 spec）
- 元认知 confidence slider（独立 spec）

每个的优先级和顺序由 T01 盲测结果驱动。
