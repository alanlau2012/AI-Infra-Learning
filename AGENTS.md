# AGENTS.md

本文件为 AI coding agent 在本仓库工作时的项目级指引。请优先遵循这里的约定，再结合具体任务做最小可用迭代。

## 项目定位

- 这是一个面向 GTS AI Infra 团队内部学习的 Windows Electron MVP。
- 当前 Phase 1 只聚焦知识点学习：内置 4 个 Stage、21 个 Topic、专题详情、学习状态持久化、进度统计。
- 不要在没有明确要求时扩展 Phase 2 功能，例如 DAG 路线图、考试模块、错题本、内容编辑器、导入导出、多端同步。
- 产品与技术背景见 `AI-Infra-Learning-App-PRD.md` 和 `PLAN.md`。

## 技术栈

- Electron Forge + Vite + TypeScript。
- Renderer 使用 React + TypeScript。
- 内置课程内容来自 `resources/seed_data.json`；用户学习进度持久化到 `app.getPath('userData')/progress.json`。
- 测试使用 Vitest、Testing Library、jsdom。
- 包管理使用 npm，依赖版本以 `package.json` 和 `package-lock.json` 为准。

## 常用命令

- 安装依赖：`npm install`
- 启动开发版：`npm start`
- 运行测试：`npm test`
- 类型检查：`npm run typecheck`
- Windows 打包：`npm run build`
- 取消跟踪误入库的 `node_modules`：`npm run deindex:node_modules`

## 代码结构

- `src/main/`：Electron main process、IPC、学习数据 store、安全配置、资源路径解析。
- `src/main/preload.ts`：唯一允许暴露给 renderer 的桥接 API。
- `src/renderer/`：React UI、样式和浏览器端类型声明。
- `src/shared/types.ts`：main、preload、renderer 共享的数据类型。
- `resources/seed_data.json`：内置学习内容 seed。
- `test/`：学习数据、路径、安全和 UI 相关测试。

## 实现原则

- 以 MVP 方式迭代：先完成最小可用闭环，再按需求扩展。
- 优先保持现有架构边界：数据读写留在 main process，renderer 只通过 `window.learning` 调 IPC。
- 变更数据结构时，同步更新 `src/shared/types.ts`、seed、学习数据 store 和测试。
- 避免为了兼容未发布的分支中间状态而叠加 shim；当前分支上的未发布实现可以直接替换为更清晰的方案。
- 保持 TypeScript `strict` 下可通过类型检查。
- 新增逻辑优先写小而明确的函数，避免过早抽象。

## Electron 安全基线

- `BrowserWindow` 必须保持安全配置：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、`webSecurity: true`。
- Renderer 不得直接访问 Node、文件系统、进度文件或 raw `ipcRenderer`。
- preload 只通过 `contextBridge.exposeInMainWorld('learning', ...)` 暴露必要 API。
- 新增 IPC 时必须校验入参类型和值域，并在测试中覆盖非法输入。
- 禁止随意放宽生产 CSP。开发模式仅允许 Vite HMR 必需的 `unsafe-inline`、`unsafe-eval` 和 localhost websocket。
- 继续拒绝新窗口打开和非应用 URL 导航，除非有明确产品需求和安全评审。

## 数据与资源

- 学习进度路径必须使用 `app.getPath('userData')/progress.json`，不要硬编码用户目录或 `%APPDATA%`。
- 开发环境资源从应用根目录解析；打包环境资源从 `process.resourcesPath` 解析。
- `resources/seed_data.json` 需要作为 Forge `extraResource` 打包资源保留。
- 内容数据和用户进度应保持分离：专题内容只来自 seed，进度只写入 `progress.json`。
- 不要重新引入 SQLite 或迁移系统，除非有明确 Phase 2/3 数据复杂度需求。

## 测试要求

- 修改 seed、学习数据 store 或进度逻辑后，至少运行 `npm test`。
- 修改共享类型、IPC 或主进程逻辑后，运行 `npm run typecheck`。
- 修改 Electron 安全配置时，补充或更新 `test/electronSecurity.test.ts`。
- 修改资源路径或打包资源时，补充或更新路径/打包相关测试，并考虑 Windows 打包验证。
- UI 变更应覆盖关键交互：加载初始数据、切换 Topic、更新学习状态、错误展示。

## Windows 与打包注意事项

- 目标平台优先 Windows。
- Forge 默认输出到系统临时目录 `ai-infra-learning-out`，避免中文工程路径触发 Squirrel/rcedit 不稳定问题。
- 可通过 `FORGE_OUT_DIR` 覆盖打包输出目录。
- 首轮内部分发可以是未签名 Squirrel/zip，扩大分发前再处理代码签名。

## 文档与沟通

- 面向用户或项目文档默认使用简体中文。
- 修改行为边界时，在 PR 或说明中明确是否影响 Phase 1 验收。
- 不要提交生成产物、临时日志、数据库文件或 `node_modules`。
