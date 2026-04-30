# CLAUDE.md

本文件是 AI coding agent 在本仓库工作的项目级指引。优先遵循本文约定，再结合具体任务做最小可用迭代。

---

## 项目定位

**产品定位：交互式学习产品（非电子书）**。判定标准：核心 5 个 topic（T01 Roofline / T02 KV Cache / T06 vLLM / T09 MTP / T10 量化）必须含交互组件——用户必须"动一下"才能形成判断力。任何 PR 不符合这条定位（例：继续把"卡片+图标"当学习能力堆叠、用纯文本满足"覆盖某概念"）应被拒。如果 Phase 2 的 RooflineChart gate 测试失败（5 人盲测中能凭直觉判 bound 的少于 3 人），整体路线回退到"高保真电子书"，砍 Roadmap/状态机/buildCheckpoints；不接受继续走中间路线。

GTS AI Infra 团队内部学习 App（Windows Electron 桌面端）。当前已交付 Phase 1 MVP + Phase 2 第一批增量。

- **Phase 1 已交付**：4 个 Stage / 21 个 Topic 的内置学习内容、专题详情、学习状态持久化、进度统计
- **Phase 2 已交付（DAG + Markdown + 交互组件增量）**：
  - 路线图视图：React Flow 渲染 21 节点的依赖 DAG，按 Stage 分组、主干路径金色高亮、点击节点跳转列表
  - Topic 富文本：seed 内容生成/承载 Markdown，支持代码块（语法高亮）、表格、引用、列表
  - T01 RooflineChart 交互组件：Explore 模式（自选硬件/场景拖拉比较）+ Gate 判断力检验（5 题 / 通过 4 题解锁 completed）
    - split-before-render 指令解析（`:::interactive{...}:::`），XSS 防线不变
    - 答案键（correctAnswer / explanation）仅存 main 进程，不下发 renderer
    - 通关自动写 `topicStatus = 'completed'`，进度 v2 格式增 `topicGate` 字段
- **Phase 2 未交付**：考试模块、知识管理 CRUD、JSON 导入导出
- **Phase 3+ 暂不动**：移动端、多端同步、AI 出题、主题切换

产品和原始规划文档（`AI-Infra-Learning-App-PRD.md`、`PLAN.md`）已被 `.gitignore` 排除，仅存在于 Alan 本地。当前增强方案见 `C:\Users\AlanL\.claude\plans\ai-infra-learning-app-prd-concurrent-gray.md`。

---

## 技术栈

- Electron Forge 7.x + Vite + TypeScript
- Renderer：React 19 + TypeScript
- 本地数据：`resources/seed_data.json` 承载课程内容，`userData/progress.json` 持久化学习状态
- DAG：`@xyflow/react` (React Flow v12) + `dagre` 自动布局
- Markdown：`markdown-it` + `DOMPurify` + `highlight.js`（按需注册 8 种语言）
- 测试：Vitest + Testing Library + jsdom
- 包管理：npm（依赖以 `package.json` / `package-lock.json` 为准）

---

## 常用命令

```bash
npm install              # 装依赖
npm start                # 启动 Electron dev
npm test                 # 跑全部测试（8 文件 / 65 用例）
npm run typecheck        # tsc --noEmit
npx vite build           # 仅打 renderer bundle 验证
npm run build            # vite build + electron-forge package（Win x64）
npm run deindex:node_modules   # 清理误入库的 node_modules
```

## 代码结构

```
src/
  main/
    main.ts                      Electron 主进程入口、IPC 注册（含 4 个 gate handler）、CSP 安装、单实例锁
    preload.ts                   contextBridge 暴露 window.learning（9 个方法）
    learningStore.ts             seed + progress.json 数据服务（getOutline/getTopic/getProgress/getRoadmapGraph/updateTopicStatus + 4 个 gate 方法）
    paths.ts                     dev/prod 资源路径解析
    security.ts                  CSP 字符串生成 + isValidStudyStatus
  renderer/
    App.tsx                      顶层 state（outline/topic/progress/roadmap/view），无 react-router
    main.tsx                     React 挂载入口
    styles.css                   主题样式 + ViewTabs + .markdown-body
    lib/
      markdown.ts                markdown-it + DOMPurify + highlight.js 单例（XSS 防线）
      directive.ts               split-before-render 指令解析（whitelist: roofline-chart）
    components/
      Sidebar.tsx                两级导航树
      TopicDetailView.tsx        详情卡片（why / key_points / bodyMd / real_world_connection）
      MarkdownContent.tsx        分段渲染：markdown 段 → MarkdownSegment，directive 段 → 交互组件
      ViewTabs.tsx               列表 / 路线图 切换
      roadmap/
        RoadmapView.tsx          React Flow 容器
        TopicNode.tsx            自定义 topic 节点（状态色 + 难度星 + 主干描金）
        StageGroupNode.tsx       Stage 背景分组
        useDagreLayout.ts        dagre LR 布局 + Stage bounding box
        roadmap.css              roadmap 作用域样式
      interactive/
        RooflineChart/
          index.tsx              加载 topicGate，分发到 ExplorePanel / GatePanel
          ChartCanvas.tsx        SVG 手绘：log10 轴 + roofline折线 + 工作点 + 轴投影
          ExplorePanel.tsx       硬件/对比/场景三联下拉 + 图表 + 边界说明
          GatePanel.tsx          5 状态机：idle→in_progress→reveal→result→passed/failed
          roofline.math.ts       纯函数：ridgeAI / rooflinePerf / boundFor / logScale
          roofline.css           chart + panel 样式
  shared/
    types.ts                     main / preload / renderer 共享类型（含 10 个 gate 类型）

resources/
  seed_data.json                 4 Stage / 21 Topic seed + learning_paths.main_track

test/
  learningStore.test.ts          seed 加载、progress v2 持久化（含 topicGate）、roadmap graph、非法输入
  markdown.test.ts               11 用例：XSS sanitization + 渲染基础
  markdownDirective.test.ts      3 用例：directive 解析（代码围栏感知、whitelist 过滤）
  rooflineMath.test.ts           4 用例：ridgeAI / rooflinePerf / boundFor / logScale
  renderer.test.tsx              14 用例：加载、状态切换、视图切换、sidebar 选中、sources 渲染
  electronSecurity.test.ts       5 用例：CSP / webPreferences
  paths.test.ts                  2 用例：dev/prod 路径解析
  setup.ts                       jsdom polyfill（ResizeObserver / DOMMatrix）
```

---

## IPC 边界

`window.learning` 是 renderer 与 main 之间唯一的桥（`src/main/preload.ts`）：

| 方法 | 返回 |
|------|------|
| `getOutline()` | `StageWithTopics[]` |
| `getProgress()` | `ProgressSummary` |
| `getTopic(id)` | `TopicDetail`（含 `bodyMd`、`prerequisites`、`keyPoints`） |
| `getRoadmapGraph()` | `{ edges: {from,to}[]; mainTrack: string[] }` |
| `updateTopicStatus(id, status)` | `TopicDetail` |
| `getTopicGate(topicId)` | `TopicGate \| null`（含历史 attempts / status；不含答案键） |
| `startGateAttempt(topicId)` | `GateQuestion[]`（洗牌后 N 题；不含 ai / correctAnswer） |
| `checkSingleAnswer(topicId, questionId, answer)` | `SingleAnswerResult`（correct + correctAnswer + explanation + 工作点坐标） |
| `finalizeAttempt(topicId, answers)` | `GateAttemptResult`（passed / correctCount / total；通关写 completed） |

新增 IPC 必须：
1. 在 `learningStore.ts` 写纯函数（input → seed/progress → output）
2. 在 `main.ts` 用 `ipcMain.handle('learning:xxx', ...)` 注册
3. 在 `preload.ts` 通过 `ipcRenderer.invoke` 暴露到 `learning.xxx`
4. 在 `shared/types.ts` 定义返回类型
5. 校验入参类型/值域，并加入测试覆盖非法输入

---

## 数据与持久化

- 进度路径：`app.getPath('userData')/progress.json`，禁止硬编码 `%APPDATA%`
- Resources 路径：开发用 `app.getAppPath()`，打包用 `process.resourcesPath`
- **内容数据 vs 用户进度严格分离**：
  - 内容：`resources/seed_data.json`（含 `gate` 字段：hardwarePresets / scenarios / attemptConfig）
  - 进度：`progress.json`，v2 格式 `{ "version": 2, "topicStatus": { "T01": "completed" }, "topicGate": { "T01": { "status": "passed", "attempts": 1 } } }`
  - v1 进度文件静默迁移：`topicGate` 缺失时视为 `{}`，无需显式 migration
- 不要重新引入 SQLite / migrations，除非产品明确进入更复杂的数据管理阶段。

---

## Electron 安全基线

`BrowserWindow` 必须保持：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、`webSecurity: true`。

CSP（`src/main/security.ts`）：
- Dev：放开 Vite HMR 必需的 `unsafe-inline / unsafe-eval / ws://localhost:*`
- Prod：严格 `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'`
- React Flow 的 inline `style` 属性在 Electron 上**默认不被 `style-src` 拦截**（DOM 属性 ≠ `<style>` 块）。如真出问题，最小补丁是 `style-src-attr 'unsafe-inline'`，**不要**放开 `style-src`。

### Markdown XSS 防线（不要绕过）

`src/renderer/lib/markdown.ts` 的渲染管道：
1. `markdown-it` 配置 `html: false`（裸 HTML 一律转义）
2. 输出 HTML 字符串走 `DOMPurify.sanitize`
3. `ALLOWED_URI_REGEXP` 仅允许 `http(s) | mailto | # | /`
4. `afterSanitizeAttributes` hook 双重拒绝 `data:` / `javascript:` URL，给 http 链接强制 `rel=noopener noreferrer target=_blank`
5. 渲染组件用 `dangerouslySetInnerHTML`，但这步前已 sanitize

绝不允许：
- `markdown-it` 开 `html: true`
- 跳过 `DOMPurify`
- 放宽 `ALLOWED_URI_REGEXP`
- 引入需要 `unsafe-eval` 的依赖（如 KaTeX 历史版本）

### 交互指令（split-before-render）

`src/renderer/lib/directive.ts` 在 markdown-it / DOMPurify 之前扫描并**剥离** `:::interactive{...}:::` 块：

- 指令块永不进入 XSS 管道（已剥离）
- whitelist：`component` ∈ `{'roofline-chart'}`，`mode` ∈ `{'explore','gate'}`，不在 whitelist 的指令静默丢弃
- 代码围栏内的 `:::` 不被解析（代码示例安全）
- 新增交互组件必须在 whitelist 内注册，并在 `MarkdownContent.tsx` 添加对应分支

### Gate 答案安全

- `GateQuestion`（下发 renderer）：只含 `id, name, hardwareId, category, tags`
- `SeedGateScenario`（仅 main 进程）：含 `ai, correctAnswer, explanation`
- `checkSingleAnswer` 在 main 进程比对后才将 `correctAnswer / explanation / operatingPoint` 返回给单次请求；renderer 不持有答案字典

---

## 测试要求

- 改 seed / learning store / 进度逻辑：`npm test`
- 改共享类型 / IPC / 主进程：`npm run typecheck`
- 改 Electron 安全配置：补 `test/electronSecurity.test.ts`
- 改资源路径或打包：补 `test/paths.test.ts`，并考虑打包验证
- 改 Markdown 管道：补 `test/markdown.test.ts` 的 XSS 用例
- 改 directive 解析：补 `test/markdownDirective.test.ts`
- 改 roofline 数学：补 `test/rooflineMath.test.ts`
- 改 gate IPC / learningStore：补 `test/learningStore.test.ts` 的 gate 用例，确保非法输入被拒
- 改 UI：覆盖加载初始数据、切换 Topic、更新状态、视图切换

### React Flow 在 jsdom 下的限制

React Flow v12 在 jsdom 里**不会渲染节点 DOM**（即便补 `ResizeObserver` / `DOMMatrix` polyfill）。集成测试只验证：
1. 视图容器 `data-testid="roadmap-root"` 出现
2. `getRoadmapGraph` IPC 被调用
3. 节点点击的回调通过单元测试覆盖（直接调 `selectFromRoadmap`），不在 jsdom 里点真实节点

节点点击的端到端联动需要 Electron 实窗手测。

---

## Windows 与打包

- 目标平台优先 Windows
- Forge 默认输出到系统临时目录 `ai-infra-learning-out`，避免中文工程路径触发 Squirrel/rcedit 不稳定
- 可用 `FORGE_OUT_DIR` 覆盖打包输出目录
- 首轮内部分发可用未签名 Squirrel/zip；扩大分发前补代码签名

---

## 实现原则

- MVP 迭代：先完成最小可用闭环，再按需扩展
- 保持架构边界：数据读写留在 main，renderer 只调 `window.learning.*`
- 改数据结构必须同步更新：`shared/types.ts` + seed（如需）+ learning store + 测试
- 不为兼容未发布的中间状态叠加 shim
- 保持 TypeScript `strict` 通过
- 优先小而明确的函数，避免过早抽象
- 不主动扩展 Phase 2 未交付的考试 / CRUD 功能，除非用户明确要求

---

## 文档与沟通

- 面向用户的文档默认简体中文
- 修改行为边界时在 PR / 说明里标明是否影响 Phase 1 / Phase 2 验收
- 不要提交：生成产物、临时日志、进度文件、旧数据库文件、`node_modules`、PRD/PLAN（均已 gitignored）
