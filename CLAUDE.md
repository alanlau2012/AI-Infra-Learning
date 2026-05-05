# CLAUDE.md

本文件是 AI coding agent 在本仓库工作的项目级指引。优先遵循本文约定，再结合具体任务做最小可用迭代。

---

## 项目定位

**产品定位：高保真电子书（Enterprise Agent Platform Builder 学习手册）**。GTS AI Infra 团队内部学习 App（Windows Electron 桌面端），用 Markdown 渲染 + 侧边栏导航 + 路线图 DAG 三件套承载 4 Stage / 15 Topic 课程内容。**没有交互组件、没有判断力 gate、没有自动判分**。Phase 2 曾尝试 RooflineChart + gate 路线，因核心 5 个 topic 全部换主题、宿主消失，已于 2026-05 全量回退电子书定位（详见 [docs/2026-05-content-audit.md](docs/2026-05-content-audit.md)）。

任何 PR 不要重新引入"交互组件 / 自动判分 / split-before-render directive 解析"，除非产品明确转向。

- **当前已交付**：4 个 Stage / 15 个 Topic 的 Enterprise Agent Platform Builder 课程内容、专题详情、学习状态持久化、进度统计、路线图 DAG、Topic 富文本（代码块 / 表格 / 引用 / 列表）
- **不在路线图**：考试模块、知识管理 CRUD、JSON 导入导出、移动端、多端同步、AI 出题、交互判断力 gate

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
npm test                 # 跑全部测试（6 文件 / 56 用例）
npm run typecheck        # tsc --noEmit
npx vite build           # 仅打 renderer bundle 验证
npm run build            # vite build + electron-forge package（Win x64）
npm run deindex:node_modules   # 清理误入库的 node_modules
```

## 代码结构

```
src/
  main/
    main.ts                      Electron 主进程入口、IPC 注册（5 个 learning handler + 1 theme handler）、CSP 安装、单实例锁
    preload.ts                   contextBridge 暴露 window.learning（7 个方法）
    learningStore.ts             seed + progress.json 数据服务（getOutline / getTopic / getProgress / getRoadmapGraph / updateTopicStatus）
    settingsStore.ts             theme 设置持久化
    paths.ts                     dev/prod 资源路径解析
    security.ts                  CSP 字符串生成 + isValidStudyStatus / isValidAppTheme
  renderer/
    App.tsx                      顶层 state（outline / topic / progress / roadmap / view），无 react-router
    main.tsx                     React 挂载入口
    styles.css                   主题样式 + ViewTabs + .markdown-body
    lib/
      markdown.ts                markdown-it + DOMPurify + highlight.js 单例（XSS 防线）
    components/
      Sidebar.tsx                两级导航树
      TopicDetailView.tsx        详情卡片（why / key_points / bodyMd / real_world_connection / sources / 检查点）
      MarkdownContent.tsx        纯 markdown 渲染（dangerouslySetInnerHTML，sanitize 已在 markdown.ts 内做）
      ProgressOverview.tsx       Stage 进度概览
      ViewTabs.tsx               列表 / 路线图 切换
      roadmap/
        RoadmapView.tsx          React Flow 容器
        TopicNode.tsx            自定义 topic 节点（状态色 + 难度星 + 主干描金）
        StageGroupNode.tsx       Stage 背景分组
        useDagreLayout.ts        dagre LR 布局 + Stage bounding box
        roadmap.css              roadmap 作用域样式
  shared/
    types.ts                     main / preload / renderer 共享类型

resources/
  seed_data.json                 4 Stage / 15 Topic seed + learning_paths（main_track + 3 条 alternative tracks）

test/
  learningStore.test.ts          seed 加载、progress v2 持久化、roadmap graph、非法输入、source 投影
  markdown.test.ts               XSS sanitization + 渲染基础
  renderer.test.tsx              加载、状态切换、视图切换、sidebar 选中、sources 渲染、热重载
  electronSecurity.test.ts       CSP / webPreferences
  paths.test.ts                  dev/prod 路径解析
  settingsStore.test.ts          theme 持久化
  setup.ts                       jsdom polyfill（ResizeObserver / DOMMatrix）
```

---

## IPC 边界

`window.learning` 是 renderer 与 main 之间唯一的桥（`src/main/preload.ts`）：

| 方法 | 返回 |
|------|------|
| `getOutline()` | `StageWithTopics[]` |
| `getProgress()` | `ProgressSummary` |
| `getSettings()` | `AppSettings`（含 theme） |
| `getTopic(id)` | `TopicDetail`（含 `bodyMd`、`prerequisites`、`keyPoints`、`sources`） |
| `getRoadmapGraph()` | `{ edges: {from,to}[]; mainTrack: string[] }` |
| `updateTopicStatus(id, status)` | `TopicDetail` |
| `updateTheme(theme)` | `AppSettings` |
| `onSeedReloaded(callback)` | unsubscribe fn（dev 模式 seed 文件热重载通知） |

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
  - 内容：`resources/seed_data.json`
  - 进度：`progress.json`，v2 格式 `{ "version": 2, "topicStatus": { "T01": "completed" } }`
  - v1 进度文件静默兼容；老 v2 文件含已废弃的 `topicGate` 字段会被静默丢弃，不报错
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

### 不要重新引入交互指令解析

`split-before-render` directive 解析（`:::interactive{...}:::`）已于 2026-05 删除。理由：5 个核心 topic 全部换主题导致原 RooflineChart 宿主消失，整套 gate IPC + 交互组件成孤儿代码。如未来要恢复交互能力，必须先经过产品定位讨论，不要在内容 PR 里悄悄加回 directive 解析。

---

## 测试要求

- 改 seed / learning store / 进度逻辑：`npm test`
- 改共享类型 / IPC / 主进程：`npm run typecheck`
- 改 Electron 安全配置：补 `test/electronSecurity.test.ts`
- 改资源路径或打包：补 `test/paths.test.ts`，并考虑打包验证
- 改 Markdown 管道：补 `test/markdown.test.ts` 的 XSS 用例
- 改 UI：覆盖加载初始数据、切换 Topic、更新状态、视图切换、sources 渲染

### React Flow 在 jsdom 下的限制

React Flow v12 在 jsdom 里**不会渲染节点 DOM**（即便补 `ResizeObserver` / `DOMMatrix` polyfill）。集成测试只验证：
1. 视图容器 `data-testid="roadmap-root"` 出现
2. `getRoadmapGraph` IPC 被调用
3. 节点点击的回调通过单元测试覆盖（直接调 `selectFromRoadmap`），不在 jsdom 里点真实节点

节点点击的端到端联动需要 Electron 实窗手测。

---

## 内容质量基线（2026-05 内容审查后落地）

- **每个 topic 至少 3 条独立权威信源**（vendor 官方文档 / arXiv 论文 / 一线团队博客），不得集中于单一来源
- **body_md 至少出现 1 个带数字的 war story 或案例**（"我们某次 P99 TTFT 从 X 涨到 Y，定位到 Z"），避免"清单 + 反问句"AI 模板
- **凡涉及华为生态的话题，至少出现 1 个具体名词**（MindIE / Atlas / CANN / HCCL），体现私有化受限网络的差异化视角
- **2024-2026 年的关键演进必须在相关 topic 现身**：MCP（T07）、Anthropic Skills（T05）、OpenTelemetry GenAI semantic conventions（T10）、OWASP LLM Top 10 2025 / NIST AI RMF / EU AI Act（T11）、Anthropic prompt caching（T10）、Chunked Prefill / Disaggregated P/D（T02）
- **难度与时长必须诚实**：T01 / T15 难度 ≤ 2；T07 / T09 / T11 难度 4 或拆分

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
- 不主动扩展未交付的考试 / CRUD / 交互 gate 功能，除非用户明确要求

---

## 文档与沟通

- 面向用户的文档默认简体中文
- 修改 topic 内容时，PR 描述要列：(1) 修了哪个 P0/P1/P2 项（参见 [docs/2026-05-content-audit.md](docs/2026-05-content-audit.md)）；(2) 新引用了哪些信源
- 不要提交：生成产物、临时日志、进度文件、旧数据库文件、`node_modules`、PRD/PLAN（均已 gitignored）
