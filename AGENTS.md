# AGENTS.md

本文件是 AI coding agent 在本仓库协作时的项目级约束。请优先遵循本文，再结合任务做最小可用迭代。

## 项目当前状态（以当前分支代码为准）

- 这是面向 GTS AI Infra 团队内部学习的 Windows Electron 应用。
- 当前已落地的学习能力包含：
  - 4 个 Stage、15 个 Topic 的学习列表与详情页（Enterprise Agent Platform Builder 课程）。
  - Topic 正文渲染（Markdown）、专题图示（`resources/topic-diagrams`）与来源信息（`sources`）。
  - 学习状态持久化（`progress.json`）与进度统计。
  - 路线图视图（Roadmap）与主干学习路径展示。
  - 主题设置（light/dark）持久化（`settings.json`）。
  - 开发模式 seed 热重载（修改 `resources/seed_data.json` 后自动刷新）。
- 未明确要求时，不要扩展到考试系统、错题本、内容编辑器、导入导出、多端同步、在线后端等 Phase 2/3 功能。

## 技术栈与依赖

- Electron Forge + Vite + TypeScript（`strict`）。
- Renderer：React + TypeScript。
- 图谱视图：`@xyflow/react` + `dagre`。
- Markdown 渲染相关：`markdown-it`、`dompurify`、`highlight.js`。
- 测试：Vitest + Testing Library + jsdom。
- 包管理：npm（以 `package.json`、`package-lock.json` 为准）。

## 数据与资源约定

- 内置课程数据：`resources/seed_data.json`（只读内容源）。
- 题图资源：`resources/topic-diagrams/*.svg`（通过 `learning-asset://` 协议访问）。
- 来源快照：`resources/source-snapshots/*.md`（内容核验留痕）。
- 用户学习进度：`app.getPath('userData')/progress.json`。
- 用户主题设置：`app.getPath('userData')/settings.json`。
- 内容数据与用户数据必须分离：不要把用户状态写回 seed 或资源目录。
- 不要重新引入 SQLite/迁移系统；本分支已采用 JSON 文件存储方案。

## 架构边界

- `src/main/`：主进程、IPC、存储、路径解析、安全策略。
- `src/main/preload.ts`：唯一桥接层，仅通过 `contextBridge.exposeInMainWorld('learning', ...)` 暴露 API。
- `src/renderer/`：React UI，不得直接访问 Node/fs/raw `ipcRenderer`。
- `src/shared/types.ts`：main/preload/renderer 共享类型，结构变更必须同步更新相关实现与测试。
- 仅通过 `window.learning` 与主进程通信，当前 API 包括：
  - `getOutline/getProgress/getTopic/getRoadmapGraph`
  - `updateTopicStatus`
  - `getSettings/updateTheme`
  - `onSeedReloaded`

## Electron 安全基线（不可放宽）

- `BrowserWindow` 必须保持：
  - `contextIsolation: true`
  - `sandbox: true`
  - `nodeIntegration: false`
  - `webSecurity: true`
- IPC 必须做入参校验（类型 + 值域），非法输入应抛错并有测试覆盖。
- CSP：
  - Dev 仅允许 Vite HMR 必需项（`unsafe-inline`、`unsafe-eval`、`localhost` ws/http）。
  - Prod 保持严格 CSP，不得随意放宽。
- 继续拒绝新窗口与非应用内导航；外链仅允许 `http/https` 并使用系统浏览器打开。
- `learning-asset://` 协议只允许访问白名单目录与合法文件名，禁止路径逃逸。

## 实现原则

- 以 MVP 方式迭代：先保证闭环，再扩展。
- 保持主进程负责数据读写，renderer 只负责展示与交互。
- 新增逻辑优先小函数、低耦合、可测试，避免过早抽象。
- 不为“未发布分支中间态”叠加兼容 shim；可直接替换为更清晰实现。
- 默认使用 UTF-8 编码；避免引入乱码文本。

## 常用命令

- 安装依赖：`npm install`
- 启动开发：`npm start`
- 运行测试：`npm test`
- 测试监听：`npm run test:watch`
- 类型检查：`npm run typecheck`
- 构建/打包（Windows）：`npm run build`
- 取消跟踪误入库 `node_modules`：`npm run deindex:node_modules`
- 校验来源数据：`npm run verify:sources`

## 测试与验收要求

- 修改 `seed_data.json`、`learningStore`、进度统计、Roadmap 图数据后，至少运行 `npm test`。
- 修改共享类型、IPC、preload、主进程逻辑后，运行 `npm run typecheck`。
- 修改安全配置时，补充或更新 `test/electronSecurity.test.ts`。
- 修改路径解析、打包资源或 `learning-asset` 逻辑时，补充或更新 `test/paths.test.ts`。
- 修改设置持久化逻辑时，补充或更新 `test/settingsStore.test.ts`。
- UI 变更应覆盖关键交互：初始加载、Topic 切换、状态更新、视图切换、错误展示、主题切换。

## Windows 与打包注意事项

- 目标平台优先 Windows。
- Forge 输出目录默认在系统临时目录 `ai-infra-learning-out`，用于规避中文路径下 Squirrel/rcedit 不稳定问题。
- 可通过 `FORGE_OUT_DIR` 覆盖输出目录。
- `resources/seed_data.json` 与 `resources/topic-diagrams` 需作为 `extraResource` 保留。

## 文档与提交规范

- 面向项目成员的说明默认使用简体中文。
- 变更功能边界时，说明是否影响当前学习 MVP 验收范围。
- 不要提交构建产物、临时日志、数据库文件或 `node_modules`。
