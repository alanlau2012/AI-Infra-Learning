# AI-Infra-Learning 2026 Demo 重构交接说明书

## 项目位置

目标项目目录：

`D:\AI项目\AI-Infra-Learning`

注意：有一次 Codex 会话的当前工作区是 `D:\AI项目\AI-News`，但真正项目不在那个目录。本文件已经放在 `AI-Infra-Learning` 项目根目录，Cursor 接手时请直接打开这个目录。

## 当前已完成

本轮已经把原来的学习 App 内容重构成 2026 版 AI Infra demo 原型，保留 Electron + React 应用框架，重点完成了：

1. 内容体系改为 5 个 demo 知识点：
   - `T01 NVIDIA vs 昇腾 AI Infra 栈全景`
   - `T02 KV Cache 与 PagedAttention`
   - `T03 Continuous Batching + Chunked Prefill`
   - `T04 Ascend C 算子流水线`
   - `T05 P/D 分离与推理服务加速`

2. 新增交互教学数据结构：
   - `SeedTopic.interactive_demo?: TopicInteractiveDemo`
   - `TopicDetail.interactiveDemo: TopicInteractiveDemo | null`
   - 类型定义在 `src/shared/types.ts`
   - 数据透传在 `src/main/learningStore.ts`

3. 新增 App 内原生交互动画组件：
   - `src/renderer/components/InteractiveLesson.tsx`
   - 已接入 `src/renderer/components/TopicDetailView.tsx`
   - 样式在 `src/renderer/styles.css`

4. 更新学习内容数据：
   - `resources/seed_data.json`
   - 现在是 3 个 stage、5 个 topic
   - 每个 topic 都带 `interactive_demo`
   - 每个 topic 都有 3 条以上来源

5. 新增/更新来源快照：
   - `resources/source-snapshots/T01.md`
   - `resources/source-snapshots/T02.md`
   - `resources/source-snapshots/T03.md`
   - `resources/source-snapshots/T04.md`
   - `resources/source-snapshots/T05.md`

6. 品牌文案已改为：
   - `AI Infra Learning 2026`
   - `推理系统与昇腾 CANN 学习版`

## 关键文件

请优先看这些文件：

- `resources/seed_data.json`  
  当前 5 个 demo topic 的主数据。

- `src/shared/types.ts`  
  新增了 `TopicInteractiveDemo`、`TopicInteractiveDemoKind`、`TopicInteractiveMetric` 等类型。

- `src/main/learningStore.ts`  
  新增 `interactiveDemo` clone/透传逻辑。

- `src/renderer/components/InteractiveLesson.tsx`  
  交互教学组件主入口，内部包含 5 类 demo renderer：
  - `stack_compare`
  - `kv_paged_attention`
  - `batching_prefill`
  - `ascend_operator`
  - `distributed_inference`

- `src/renderer/components/TopicDetailView.tsx`  
  在正文前渲染交互教学区。

- `src/renderer/styles.css`  
  新增交互教学区的完整样式。

- `test/learningStore.test.ts`
- `test/renderer.test.tsx`  
  已更新为 5-topic demo 结构和交互组件测试。

## 已验证通过

本轮已跑过：

```bash
npm run typecheck
npm test
npm run verify:sources -- --no-urls
```

结果：

- TypeScript 通过
- Vitest 通过：`43 tests passed`
- 离线来源检查通过
- Electron 开发入口可启动，没有启动期崩溃

## 当前 App 运行方式

在项目目录执行：

```bash
npm start
```

如果接手时发现已有旧进程占用，可以先关闭当前 Electron 窗口，或结束相关 `electron.exe` / `electron-forge start` 进程，再重新跑 `npm start`。

## 当前 Git 状态要注意

本轮主要改动文件：

- `resources/seed_data.json`
- `resources/source-snapshots/T03.md`
- `src/main/learningStore.ts`
- `src/renderer/components/Sidebar.tsx`
- `src/renderer/components/TopicDetailView.tsx`
- `src/renderer/styles.css`
- `src/shared/types.ts`
- `test/learningStore.test.ts`
- `test/renderer.test.tsx`

新增文件：

- `src/renderer/components/InteractiveLesson.tsx`
- `resources/source-snapshots/T01.md`
- `resources/source-snapshots/T02.md`
- `resources/source-snapshots/T04.md`
- `resources/source-snapshots/T05.md`
- `HANDOFF_AI_INFRA_LEARNING_2026.md`

原本已有的未跟踪文件，未纳入本次工作：

- `2026-05-07-paged-attention.html`
- `2026-05-09-chunked-prefill.html`

不要误删这两个 HTML 文件，除非明确决定迁移或清理。

## 后续要继续完成的事情

建议 Cursor 下一步按这个顺序继续：

1. 视觉 QA
   - 打开 Electron App，逐个点 5 个 topic。
   - 检查交互动画区是否有文字溢出、重叠、按钮过密、指标卡换行异常。
   - 特别看 1280px 左右宽度和深色模式。

2. 强化交互动画
   - 当前 `InteractiveLesson.tsx` 是可用 demo 原型，但动画还偏“概念仪表盘”。
   - 下一步可以把 5 类视觉做得更有“科学小实验”感：
     - KV block 动态流动
     - batching 请求逐步入队/出队
     - Ascend C tile 在 CopyIn / Compute / CopyOut 中移动
     - P/D 分离中 KV 包跨节点传输
     - 栈全景点击层级后联动说明

3. 内容精修
   - 当前正文是 demo 版，重点在结构和来源。
   - 可以继续把每个 topic 的 `body_md` 扩写成更完整的学习材料。
   - 任何具体规格、版本、性能数字必须进入对应 `source-snapshots/Txx.md` 后再写入正文。

4. 增强数据 schema
   - 当前 `interactive_demo` schema 足够 demo。
   - 后续可加入：
     - per-step metric override
     - visual config
     - glossary
     - quiz/checkpoint
     - source mapping per step

5. 做真实浏览器/窗口截图 QA
   - 当前只做了启动检查和单元测试。
   - 建议用 Playwright 或手动截图检查 UI。
   - 重点确认 Electron 实际窗口里的中文、布局、滚动、深色模式。

## 重要约束

1. 不要把交互塞进 Markdown。
   - Markdown 渲染有安全白名单。
   - 不要放宽 `src/renderer/lib/markdown.ts` 的安全限制。
   - 不要启用 iframe、object、embed、form、button 等 Markdown HTML。

2. 交互动画应继续用 React + CSS/SVG/Canvas 原生实现。
   - 当前实现没有远程资源。
   - 保持这个方向。

3. 中文编码要小心。
   - 项目在 Windows 上，PowerShell 显示中文可能乱码。
   - Node/Vite 按 UTF-8 读写正常。
   - 不要用会改变编码的编辑/脚本方式批量写 `seed_data.json`。

4. 来源优先级。
   - NVIDIA：官方 docs/blog/repo 优先。
   - 华为昇腾：hiascend 官方文档优先。
   - vLLM-Ascend：官方 docs 优先。
   - 第三方博客只能作为补充，不作为核心事实来源。

## 推荐下一步开发目标

把当前原型推进到“可演示”状态：

- 每个 topic 的交互区都有明显动效。
- 所有步骤切换都有视觉变化，不只是文字变化。
- 指标变化与动画状态一致。
- 内容解释更像教学动画，而不是文档摘要。
- 保持以下命令全绿：

```bash
npm run typecheck
npm test
npm run verify:sources -- --no-urls
```
