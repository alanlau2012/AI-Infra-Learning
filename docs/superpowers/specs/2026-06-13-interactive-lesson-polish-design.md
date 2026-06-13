# 2026-06-13 InteractiveLesson 轻量化打磨设计

- **状态**：待 review
- **分支**：`codex/enterprise-agent-platform-skills`（PR #1，DRAFT）
- **关联**：取代 [`2026-04-28-t01-roofline-chart-design.md`](./2026-04-28-t01-roofline-chart-design.md)（Phase 2 的 RooflineChart + gate 判分路线，已废弃）

---

## 一、背景与决策脉络

本项目经历了一次方向回归，理解这段历史才能看懂本 spec 的边界。

- **Phase 2（main 分支）**：尝试 RooflineChart 交互组件 + 判断力检验 gate（判分闸，5 题过 4 解锁 completed），定位"交互式学习产品"。但 seed 里 **只有 T01 一个 topic 真接了 gate**，其余 4 个核心 topic（T02/T06/T09/T10）是空头支票——内容审查报告判定为"孤儿代码 / 中间路线"。课程是 21 topic 第一性原理体系（Compute/Memory bound → 昇腾硬件 → 推理优化服务化 → 平台战略）。
- **PR #1（当前分支，未合）**：删 gate（RooflineChart 6 文件 + directive + 2 测试，共 9 个）+ 换 `InteractiveLesson` 轻量动画（无判分）+ 内容砍到 5 topic（栈全景 / KV+PagedAttention / Batching+Chunked Prefill / Ascend 算子 / P/D 分离）。DRAFT，5 个 demo 仍处 wip（"checkpoint before QA pass"），指标是硬编码假公式。
- **CLAUDE.md 严重过时**：仍写"纯电子书 / 禁止交互组件 / 15 topic Agent Platform"，与代码完全相反，且正在挡方向。
- **本次决策（2026-06-13）**：
  1. 基于 PR #1 的**轻量交互动画形态**往前，**不回 main** 重清 gate 债。
  2. **不做决策沙盒**（可调参数 / 数据驱动 responseModel / 双曲线 break-even / 决策红线 / 判分 gate / 场景诊断）——本轮明确砍掉。
  3. 教学讲解用**"分步自动播放 + 文字旁白"**轻量形态（强化现有 `playing`），不嵌真视频。
  4. **第一性原理开篇是否补回**（main 的 Compute/Memory bound 统领），做第一个 topic 时再单独决策，不在本 spec。

## 二、目标

把当前 wip 的 5 个 `InteractiveLesson` demo 打磨到**可交付质量**，让"交互动画 + 分步讲解"真正帮学习者建立**正确的机制心智模型**。形态：轻量、不卡人、无判分。

## 三、非目标（明确不做，划界防回潮）

- ❌ 决策沙盒：可调参数模拟、数据驱动响应模型、双曲线 break-even、决策红线
- ❌ 判断力检验 gate：场景诊断题、判分、卡进度
- ❌ 回到 main：不重新接 RooflineChart / directive / gate
- ❌ 拍板选型导向内容（后续阶段）
- ❌ 第一性原理开篇补回（后续单独决策）
- ❌ 嵌入真实视频文件

> 若未来要做决策沙盒或判分，必须新开 spec，不在本 spec 范围内悄悄加回（吸取 Phase 2 教训）。

## 四、范围与交付（5 件事，按优先级）

### P0-1　修掉硬编码假公式（核心，直接关系"学扎实"）

**现状**：[`InteractiveLesson.tsx`](src/renderer/components/InteractiveLesson.tsx) 的 `buildMetrics` 用 `base × (1.2 − step×0.12) × load` 这类随机公式，指标变化不反映任何机制直觉——这是"看着花哨但学不到东西"的根因。

**改造**：保持 `buildMetrics(kind, metrics, activeStep, intensity)` 纯函数签名不变，把内部逻辑换成按机制**定性响应**。不追精确模拟，但必须**定性正确、不反直觉**。每个 kind 的响应规则（这些规则本身就是知识点）：

| kind（topic） | step 推进的定性响应 | intensity（负载）↑ 的定性响应 | 关键直觉锚点 |
|---|---|---|---|
| `stack_compare`（T01 栈全景） | 对照性 demo，指标象征性、小幅波动 | 影响小 | 栈全景不表征性能，指标别误导 |
| `kv_paged_attention`（T02） | 无缓存→追加 K/V→分页（碎片↓）→共享前缀（增长放缓） | kvMemory ↑，KV 撑满时 throughput ↓ | 分页/共享前缀缓解碎片、提吞吐 |
| `batching_prefill`（T03） | 静态 batch→连续补位→chunked prefill→延迟平衡，throughput 逐 step ↑ | 并发 ↑ throughput ↑，prefill 阻塞影响 TTFT | chunked prefill 降 decode 尾延迟但略增 TTFT |
| `ascend_operator`（T04） | CopyIn→Compute→CopyOut pipeline 重叠时 throughput 高 | tile 增多，pipeline 满载后 throughput 饱和 | 搬运（bandwidth）是瓶颈 |
| `distributed_inference`（T05） | 单池（prefill 干扰 decode）→ P/D 分离（TTFT/TPOT 改善）→ KV 传输（bandwidth 成本）→ 智能路由（throughput ↑） | 高并发 P/D 收益显现；低并发 transfer 吃收益 | P/D 分离不是默认更快，KV transfer 是新成本 |

### P0-2　分步讲解做扎实

**现状**：seed 里 `steps[].explanation` 多为一句话，偏标注。

**改造**：每个 demo 的每个 step 扩到教学级——"这步发生什么 + 为什么重要 + 该建立的直觉"，配合可视化让学习者看完一个 step 就懂一个机制点。纯内容改动，无 schema 变化。

### P1-3　自动播放增强（"教学小视频"形态）

**现状**：`playing` 已实现自动演示（`setInterval` 2.2s/step）。

**改造（MVP 边界）**：强化自动播放时 step 切换与解说 / 可视化的**同步**——达到"按一下自动演示，跟着看一遍就懂"的效果。这是本轮唯一硬性验收点。播放进度指示、一键重播列为**后续可选增强，不在本 spec 验收范围**。控制在 `InteractiveLesson.tsx` 内部，不加 IPC、不改 schema。

### P1-4　5 个 demo QA 过关

完成 PR #1 未勾的 Visual QA（Electron 窗口，1280px + dark mode）：5 个 demo 都跑通、指标定性正确、解说清晰、自动播放流畅。

### P1-5　同步更新 CLAUDE.md

把过时的"纯电子书 / 禁止交互 / 15 topic Agent Platform"更新为与现实一致的定位：
- 产品定位：**轻量交互动画式学习**（非纯电子书，也非判分 gate）
- 课程：5 topic AI Infra 推理系统
- 交互：`InteractiveLesson` 动画式探索（步骤 + 滑块 + 自动播放），**无判分**
- 当前边界：不做判分 gate、不做决策沙盒（如要做须新 spec）
- 同步代码结构、IPC 边界、测试要求等与现状脱节的段落

## 五、技术设计要点

- **`buildMetrics` 改造**：纯函数，按 kind 分支实现定性响应，带机制注释。可单测——对每个 kind 给若干 `(activeStep, intensity)` 组合的**期望定性断言**（如"KV demo 在 activeStep 最大 + intensity 最大时，throughput 应低于中间档"），锚定"定性正确"，防止滑回假公式。
- **分步讲解**：`resources/seed_data.json` 的 `steps[].explanation` 文本扩充，纯内容。
- **自动播放**：`InteractiveLesson.tsx` 内 `playing` 相关 `useEffect` 增强，不引入新依赖。
- **CLAUDE.md**：纯文档。
- **全程增量**：不改 `shared/types.ts` schema、不加 IPC、不破坏现有测试。

## 六、验收标准

- `npm run typecheck` 0 error
- `npm test` 全绿（含新增 `buildMetrics` 定性响应单测）
- `npx vite build` 成功
- 5 个 demo 在 Electron 窗口（1280px + dark mode）QA 通过
- CLAUDE.md 与代码一致，不再自相矛盾

## 七、风险与边界

- **"定性正确"是主观判断** → 用机制注释 + 单测定性断言锚定，避免"看起来对其实假"。
- **不追精确数值** → UI 沿用 PR #1 已有的"示意值，非 benchmark"标注。
- **scope 回潮** → 第三节的"非目标"清单就是防线；任何超出项须新 spec。

## 八、后续阶段（不在本 spec）

- 决策沙盒（可调参数 + 数据驱动响应 + 决策红线 + 场景诊断）
- 第一性原理开篇补回（Compute/Memory bound 统领主线）
- 拍板选型导向内容（面向技术管理者的判断力）
- main 的 21 topic 中 PR #1 未保留部分的去留评估
