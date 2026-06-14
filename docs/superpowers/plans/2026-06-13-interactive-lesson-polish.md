# InteractiveLesson 轻量化打磨 Implementation Plan

> **执行方式**：用户已授权 inline 执行、不再 review gate。用 superpowers:executing-plans 逐任务实施，TDD，频繁 commit。

**Goal:** 把 5 个 InteractiveLesson demo 的 `buildMetrics` 从硬编码假公式改为机制**定性正确**响应，补充分步讲解，增强自动播放同步，更新过时的 CLAUDE.md，达到可交付质量。

**Architecture:** 保持 `buildMetrics` 纯函数签名不变（现有 `test/interactiveLesson.test.tsx` 依赖），重写内部按 `kind` 分支实现定性响应；新增 `test/buildMetrics.test.ts` 锚定定性方向；`seed_data.json` 的 `steps[].explanation` 教学级扩充；`InteractiveLesson.tsx` 自动播放同步微调；`CLAUDE.md` 文档更新。全程增量，**不改 `shared/types.ts` schema、不加 IPC**。

**Tech Stack:** React 19 + TS + Vitest + Testing Library + jsdom

**关联 spec:** [`2026-06-13-interactive-lesson-polish-design.md`](../specs/2026-06-13-interactive-lesson-polish-design.md)

---

## 关键约束（不可违反）

- `buildMetrics(kind, metrics, activeStep, intensity) => {key, value, hint}[]` 签名不变
- 每个 metric 返回 `{ key, value: string, hint: string }`，value 是可被 `getByText` 命中的字符串
- 指标随 `activeStep` 和 `intensity` 变化（现有 + 新定性测试都依赖）
- `kvMemory` 随 `intensity` 变化（`test/interactiveLesson.test.tsx` 现有断言）
- 不改 `shared/types.ts`、不加 IPC、不破坏现有测试

## buildMetrics 定性响应设计（核心决策）

每个 `kind` 在其 `seed metrics` 下的定性方向（数值示意，非 benchmark）：

| kind | key | 定性方向（随 step / intensity） | 直觉锚点 |
|---|---|---|---|
| `stack_compare` | throughput / bandwidth | 象征性温和波动 | 栈全景不表征实时性能，别误导 |
| `kv_paged_attention` | kvMemory | 随 step 增长，step≥2（分页）/3（共享前缀）增速放缓 | 分页/共享前缀压低碎片增长 |
| `kv_paged_attention` | throughput | **高 intensity（KV 满）时降**；step≥2 回升 | KV 撑满压吞吐，回收容量回升 |
| `kv_paged_attention` | TPOT | KV 越大越长，step≥2 优化后改善 | 分页优化降 decode 间隔 |
| `batching_prefill` | throughput | 逐 step 升 | 连续 batching + 切片提吞吐 |
| `batching_prefill` | TTFT | **step=2（chunked prefill）略升**，step=3 回落 | chunked prefill 切分 prefill，TTFT 反而升（反直觉修正点） |
| `batching_prefill` | TPOT | 随 step 降 | 调度改善 decode 尾延迟 |
| `ascend_operator` | throughput | 随 step 升并饱和 | pipeline 三段重叠提吞吐 |
| `ascend_operator` | bandwidth | 随 step/intensity 升 | GM↔本地内存搬运是瓶颈 |
| `distributed_inference` | TTFT | step≥1（P/D 分离）降 | prefill 专用池改善 TTFT |
| `distributed_inference` | TPOT | step≥1 降 | decode 专用池改善 TPOT |
| `distributed_inference` | throughput | step≥3（智能路由）显著升；高 intensity 收益大 | KV-aware routing 提吞吐；高并发才划算 |
| `distributed_inference` | bandwidth | **step≥1 升** | KV transfer 是 P/D 分离的新成本 |

## 定性响应单测断言（test/buildMetrics.test.ts）

锚定上表的关键方向（断言方向，不断言精确值）：

1. `kv_paged_attention` throughput：高 intensity < 低 intensity（KV 满压吞吐）
2. `kv_paged_attention` kvMemory：step1→2 增量 < step0→1 增量（分页放缓增长）；且随 intensity 变化
3. `batching_prefill` TTFT：step2 > step1（chunked prefill 升 TTFT）
4. `batching_prefill` throughput：step3 > step0（连续 batching 提吞吐）
5. `distributed_inference` TTFT：step1 < step0（P/D 分离改善）
6. `distributed_inference` bandwidth：step1 > step0（KV transfer 新成本）
7. `distributed_inference` throughput：P/D 在高 intensity 的相对收益 > 低 intensity
8. `ascend_operator` throughput：step2 > step0（pipeline 重叠）

---

## Task 1: buildMetrics 定性响应改造（TDD，核心）

**Files:**
- Create: `test/buildMetrics.test.ts`
- Modify: `src/renderer/components/InteractiveLesson.tsx`（`buildMetrics` 函数，约 373-397 行）

- [ ] Step 1: 写 `test/buildMetrics.test.ts`，实现上表 8 条定性断言（辅助函数取 `parseFloat(value)`）
- [ ] Step 2: `npm test -- buildMetrics` 跑，预期部分 FAIL（当前 TTFT 单调减、throughput 单调增、kvMemory 不随 step 变）
- [ ] Step 3: 重写 `buildMetrics` —— 按 `kind` 分支（`stackCompareMetric` / `kvMetric` / `batchingMetric` / `ascendMetric` / `distributedMetric`），每个返回定性正确的 `{value, hint}`，保持签名
- [ ] Step 4: `npm test` 全绿（含新定性测试 + 现有 `interactiveLesson.test.tsx`）
- [ ] Step 5: commit `test(buildMetrics): 锚定机制定性响应` + `refactor(InteractiveLesson): buildMetrics 改为按 kind 定性响应`

## Task 2: 分步讲解 explanation 扩充

**Files:**
- Modify: `resources/seed_data.json`（5 个 demo 的 `steps[].explanation`）

- [ ] Step 1: 每个 demo 每个 step 的 `explanation` 扩到教学级（发生什么 + 为什么重要 + 直觉锚点）
- [ ] Step 2: `npm test`（现有 `interactiveLesson.test.tsx` 断言 explanation 渲染，扩充后仍要通过）
- [ ] Step 3: commit `content: 扩充 5 demo 分步讲解至教学级`

## Task 3: 自动播放同步增强

**Files:**
- Modify: `src/renderer/components/InteractiveLesson.tsx`（`playing` 相关 `useEffect`）

- [ ] Step 1: 确保自动播放时 step 切换与 explainer/visual 同步（现有 `advances steps during auto play` 测试已覆盖推进；补"切换后 explainer 文案同步"）
- [ ] Step 2: `npm test`
- [ ] Step 3: commit（如确实改动）；无实质改动则跳过 commit、在 Task 5 备注

## Task 4: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] Step 1: 更新产品定位为"轻量交互动画式学习（非电子书、非判分 gate）"；课程改为 5 topic AI Infra；交互改为 InteractiveLesson 动画式探索无判分；同步代码结构/IPC/测试要求等过时段落；加"不做判分 gate/决策沙盒"边界
- [ ] Step 2: commit `docs: CLAUDE.md 对齐轻量交互动画现状`

## Task 5: 全量验证

- [ ] `npm run typecheck` 0 error
- [ ] `npm test` 全绿
- [ ] `npx vite build` 成功
- [ ] 若有修复则 commit；Visual QA（1280px + dark mode）留给实窗手测，在 PR 描述备注

---

## Self-Review

- **Spec 覆盖**：spec 的 P0-1→Task1、P0-2→Task2、P1-3→Task3、P1-4→Task5 备注、P1-5→Task4，全覆盖 ✓
- **Placeholder**：buildMetrics 完整代码在 Task1 Step3 实现时落地（设计已在上方定性表锁定，非 placeholder）；explanation 文本在 Task2 落地 ✓
- **类型一致**：`buildMetrics` 签名全程不变，新增辅助函数命名 `xxxMetric` 一致 ✓
- **scope**：单个 plan 可覆盖，无需拆分 ✓
