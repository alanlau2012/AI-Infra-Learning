# Windows Electron MVP 技术方案（第二轮修订版）

## Summary
- 第一版只做 PRD Phase 1：Windows Electron 可安装 App，支持 21 个知识点初始化、Stage/Topic 列表、专题详情、学习状态持久化。
- 技术栈：Electron 41.x stable、Electron Forge Vite+TypeScript、React+TypeScript、`better-sqlite3`、SQLite。
- 关键基线：迁移机制、事务化 seed、打包资源路径、Electron 安全配置、单实例锁、干净 Windows 机器验收。

## Key Changes
- 数据库放在 `app.getPath('userData')/data.db`，不硬编码 `%APPDATA%`。
- 使用 `better-sqlite3`，不依赖 `node:sqlite`。
- 建立 `schema_migrations(version, applied_at)`，启动时顺序执行迁移。
- Phase 1 建完整 PRD 表，并新增 `topic_progress(topic_id PK, status, updated_at)`，把内容数据和用户进度拆开。
- `001_init.sql` 在单一事务内完成建表、seed 导入、迁移记录写入；任一失败整体回滚。
- `resources/seed_data.json` 通过 Forge `extraResource` 打包；生产从 `process.resourcesPath` 读取，开发从项目根读取。
- 启动时调用 `app.requestSingleInstanceLock()`，第二实例只聚焦已有窗口。

## Security & Packaging
- BrowserWindow 固定配置：`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、`webSecurity: true`。
- IPC 只通过 preload 暴露 `learning.*`，不暴露 raw `ipcRenderer`。
- IPC 入参校验：`topicId` 必须存在于数据库，`status` 只能是 `not_started | in_progress | completed`。
- CSP 分支：
  - Dev：允许 Vite HMR 必需的 `unsafe-inline`、`unsafe-eval`、`ws://localhost:*`。
  - Prod：严格 CSP，`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'`。
- Windows 分发默认先用未签名 Squirrel/zip 内部分发，并在内部安装说明中标注 SmartScreen 处理；公司代码签名证书作为 Phase 1 并行流程启动。
- 因 Squirrel/rcedit 对中文工程路径不稳定，Forge 默认输出到系统临时目录 `ai-infra-learning-out`；可用 `FORGE_OUT_DIR` 覆盖。

## Test Plan
- 初始化：首次启动后有 4 个 Stage、21 个 Topic；抽查 T01 的 key_points 数量、prerequisites 与 seed JSON 一致；中文无乱码。
- 事务：人为制造 seed 导入失败后，数据库不得留下半初始化状态；修复后可重新初始化成功。
- 迁移：空库执行 `001_init.sql` 成功；已有迁移记录的库不会重复执行。
- 进度：更新 T01 状态后重启 App 状态保留；后续 seed 内容更新不覆盖 `topic_progress`。
- 安全：Dev 和 Prod CSP 均验证；Renderer 不能访问 Node/fs/raw `ipcRenderer`；非法 IPC 参数被拒绝。
- 单实例：Windows 双击两次只保留一个主进程。
- 打包：安装包能读取 `extraResource` seed；卸载/重装保留用户数据。
- Native 模块：在开发机和一台干净 Windows 机器上验证打包产物可启动，并完成 `CREATE TABLE`、`INSERT`、`SELECT`。

## Assumptions
- Alan 接受本计划即视为批准 PRD 偏离：数据路径调整、进度表拆分、DAG 延后到 Phase 2。
- Phase 1 不做知识点编辑、JSON 导入导出、DAG、考试 UI、错题本。
- 未签名包可用于首轮内部试用；正式扩大分发前补代码签名。
