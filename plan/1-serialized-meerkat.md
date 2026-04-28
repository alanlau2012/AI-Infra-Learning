# AI Infra Learning App 双角色交叉审查

审查者：AI Infra 资深技术专家 × 顶尖学习产品 PM
审查日期：2026-04-28
审查范围：seed_data.json 全部 21 topic、renderer 全部组件、Markdown 管道、styles.css、roadmap 模块

---

## 0. 先讲战略问题（最大）

**这个产品的定位本身有问题。**

它的 UI 在表演"互动学习产品"——左边 Sidebar 像 Brilliant，右边 Roadmap 像 Roam，顶上 ViewTabs 像 Notion，每个 Topic 还有难度星级、三态状态机、"学习检查点"卡片、"前置知识"链路。但点开任何一个 Topic，你拿到的是一份**深色主题的 Markdown 文档**。

**期望–交付之间的落差就是这个产品的核心问题**。用户被 UI 暗示"我要开始学了"，但实际上他在做的事是**读字 + 点击"已完成"**。整个核心循环里，唯一的"学习行为"就是阅读，而唯一的"反馈"就是状态机切换——这跟在 GitBook 里读 vLLM 文档没有本质区别，但 GitBook 不会用大量 UI 暗示让你以为它是 Brilliant。

二选一必须明确：
- **选 A：电子书定位**——砍掉 Roadmap、状态机、检查点；强化目录、搜索、笔记、引用导出。这条路简单、诚实、低成本，且长期看能给团队留下沉淀。
- **选 B：学习产品定位**——必须为至少 5 个核心 topic 加入"用户必须做点什么才能继续"的元素（参数滑块跑 Roofline、KV Cache 显存计算器、PagedAttention block 分配演示、Speculative Decoding 接受率→收益曲线、量化误差对比）。这条路成本高，但有差异化。

**继续走当前折中路线 = 拿不到任何一条路的护城河**。"内容多" 不是护城河——竞品明天 fork + 接 LLM 即可重写；"漂亮 UI" 也不是——Tailwind 模板满地都是；"DAG 视图" 是 react-flow 一个 npm install 就有的能力。

如果只能保留 30% 的内容，应该保留：T01 Compute/Memory bound、T02 KV Cache、T06 vLLM 核心机制、T08 P/D 分离、T09 MTP、T10 量化、T11 指标体系。这 7 个是"读完能产生新判断力"的部分。其他 14 个（特别是 S4 平台层 T16-T18）很大程度上是组织结构图的口语化，读完不形成判断力，只增加篇幅。

---

## 1. 产品 Mental Model

| 维度 | 我的理解 |
|---|---|
| **形态一句话** | 内置 21 篇技术 Markdown 文档的 Electron 桌面阅读器，叠加 DAG 路线图、三态状态机和右侧学习面板。**本质是 GitBook + 状态打卡。不是教程，不是练习场，不是科普。** |
| **目标用户** | GTS AI Infra 团队内部成员（推断 5–50 人量级）。前置假设：熟悉 GPU/HBM/Transformer/Attention 基础概念，在做推理工程或平台工程，需要把零散经验体系化。**不假设**知道 PagedAttention、MoE 调度、MTP、Roofline 的细节。 |
| **覆盖知识点** | S1 基础原理：T01 Compute/Memory bound、T02 KV Cache、T03 MoE、T19 Attention 演进、T20 Qwen3-Next、T21 DeepSeek V4<br>S2 硬件/引擎：T04 Ascend 910B、T05 NPU 算子、T06 vLLM、T07 vLLM-Ascend、T08 P/D 分离<br>S3 优化与服务化：T09 MTP、T10 量化、T11 指标、T12 网关、T13 治理、T14 可观测、T15 多租户<br>S4 平台：T16 生命周期、T17 MaaS 全景、T18 战略 |
| **学习路径假设** | 默认 `learning_paths.main_track` 顺序进入；UI 不强制——可从任意 sidebar topic 切入，roadmap 可视化依赖。无明确"出口"——读完最后一篇没有总结、回顾或考试。 |
| **核心交互形式** | **99% 是滚动阅读**。其他都是导航：点 sidebar、点 roadmap 节点、切 ViewTabs、点目录锚点、切状态机、点前置知识跳转、点来源外链。**零交互式学习元素**——无答题、无滑块、无可运行代码、无可视化推导、无搜索、无笔记、无高亮、无 spaced repetition。 |

---

## 2. 关键问题清单

### 战略 P0

**[P0] [战略] - 定位错位：UI 表演学习产品，实际功能是 Markdown 阅读器**
- 位置：`src/renderer/styles.css`、`src/renderer/components/roadmap/*`、`TopicDetailView.tsx:117-199`
- 问题：状态机（三态按钮）、Roadmap、难度星级、"学习检查点"卡片，全都是"学习产品标配"的视觉信号；但所有 topic 详情都是纯文本 Markdown，唯一让用户"做点什么"的是切换状态。用户进来 5 分钟就会意识到"这只是个 PDF 阅读器加了花边"，弃读概率高。
- 建议：选 A（电子书）就把 `TopicDetailView.tsx:133-146` 的状态按钮、`buildCheckpoints` 卡片、Roadmap 全部砍掉，专注做好阅读+搜索+笔记。选 B（学习产品）就在 T01/T02/T06/T09/T10 五个核心 topic 内嵌交互组件（见下文 P0 #2）。**最忌继续做"看起来很学习产品但其实是阅读器"的中间态**。

**[P0] [战略] - 没有护城河：纯手工内容 + 现成轮子，竞品 fork + LLM 一周复刻**
- 位置：整个 repo
- 问题：内容是手写的 (`resources/seed_data.json` 约 50k tokens)，但 T20/T21 已经在描述 2026 年发布的模型——内容会以季度速度过时；技术栈完全是现成轮子（react-flow、dagre、markdown-it、highlight.js）。明天有人 fork 仓库 + 接 LLM 自动续写新模型，这个项目就被复刻了。
- 建议：护城河必须来自其他地方——例如**真实生产数据沉淀**（GTS 内部基线、压测对比、调参事故记录），这是任何外部团队都拿不到的。把 `[!INTERNAL]` callout 用足，把 T07/T15/T17 这种平台层 topic 升级成"内部案例库"，对外脱敏后留作内部资产。

**[P0] [体验] - 零主动学习元素：在 AI Infra 这种反直觉知识密集领域，纯阅读 retention ≈ 不存在**
- 位置：全产品
- 问题：Roofline、KV Cache 公式、Speculative Decoding 接受率、PagedAttention block 表——这些都是**"看一遍能懂、一周后忘光"**的内容。它们的真正掌握必须靠"自己动手算一次/调一次/推一次"。没有任何机制保证用户做了这件事。
- 建议（选 B 路线）：至少给 T01、T02、T06、T09、T10 做最小可用的交互件：
  - T01: 一个 `<RooflineChart>` 组件，给定 hardware（910B/H100）和 op (matmul/attention/decode)，画出 Roofline + 当前点
  - T02: 一个 `<KVCacheCalc>` 组件，输入 layers/heads/dim/seq/batch/dtype，实时输出 GB 数和单卡可承载并发
  - T06: 一个 `<BlockTableViz>`，几个请求按 prefix-share 分配 block 的动画
  - T09: 一个滑块控制 α（接受率）和 K（候选长度），输出实测加速比 vs 朴素计算
  - T10: FP16/INT8/INT4 三种量化在同一权重上的可视化误差对比

### 体验 P1

**[P1] [体验] - "学习检查点"是模板化复读，没有 retrieval practice 价值**
- 位置：`TopicDetailView.tsx:221-228` 的 `buildCheckpoints`
- 问题：检查点的生成逻辑是把每个 topic 的 `key_points` 直接渲染成"能否解释：[关键判断]"。但读者刚刚读完 key_points——这等于让用户"复读自己刚看过的句子"。真正的检查点应该是**用户必须从原理推导才能答出**的问题（例："给定 70B 模型在 8K 上下文下的 KV Cache 约多少 GB？" 而不是"能否解释 KV Cache 公式"）。
- 建议：在 seed 增加 `selfcheck` 字段，存"必须推导/计算/选择"的问题；UI 上做一个折叠"先答再看"的样式（先显示问题、隐藏答案、点击展开）。这是最低成本的 retrieval practice 实现，无需任何后端。

**[P1] [体验] - 没有搜索：21 个 topic 还能扛，下一批扩展到 40+ 就废了**
- 位置：缺失能力——无 `Search.tsx`、无全文索引
- 问题：用户在第 18 篇文章里看到"前面提过 Roofline"想跳回去——只能靠记忆点 sidebar。Markdown 内容里所有的术语都没法搜索。
- 建议：本地 Ctrl+K 全文搜索，对着 `seed_data.json` 的 `body_md` + `key_points` + `name` 跑 lunr 或 minisearch（10kb 依赖、本地索引），第一版只索引标题和段落。

**[P1] [体验] - 没有笔记 / 高亮 / 书签 / 复习 — 学完即忘**
- 位置：缺失能力
- 问题：`progress.json` 只存 `topicStatus`。用户读到一段"卧槽这就是 P/D 分离的真正原因"——产品没给他任何持久化这个想法的方式。一周后他记得自己读过 T08，但记不得当时的悟点。
- 建议：第一版只加"per-topic 笔记字段"+ 顶栏"我的笔记"汇总视图。文本框 + localStorage / progress.json 扩展。一天工作量。

**[P1] [体验] - 第一分钟没有"哇"时刻**
- 位置：`App.tsx:127-189`、首屏布局
- 问题：用户启动 → 加载动画 → Sidebar + 默认 Topic 详情 → 开始读字。没有 onboarding、没有"你将获得什么"、没有"先看看这张图"。Brilliant 第一分钟你在拖滑块；3Blue1Brown 第一分钟动画抓住你；Bartosz Ciechanowski 第一分钟你在拖一个齿轮；这里第一分钟你在读"Compute-bound vs Memory-bound 是推理优化决策的根基"。
- 建议：首屏插一张**整个 21 topic 的 Roadmap 全景**作为 landing（不是默认进 T01 详情）；点击节点才进详情。让 DAG 这个最有视觉冲击力的资产先发挥作用。

**[P1] [体验] - 视觉是"AI 仪表盘美学"，距离 craft 级有数量级差距**
- 位置：`src/renderer/styles.css`（深色 #101214 + 青绿 #3dd6c6 + 毛玻璃 18px + 多重渐变 + 圆角 8px + Inter 字体堆叠）
- 问题：这是 2024 年起所有 AI 产品的同一套模板。Bartosz Ciechanowski 的页面是白底纯黑文字、所有焦点都是交互组件本身；Distill.pub 是论文质感、内容压倒装饰。这个产品的视觉语言**告诉读者"我是一个 SaaS 仪表盘"**，而不是"我是一篇值得读三小时的论文"。
- 建议：考虑做一个白底 reading-mode 切换（不是简单反色，是 typography 重做：宽度 720px、衬线字体、行高 1.9），这是低成本但能直接拉开视觉档次的改动。`styles.css:1-24` 的色板复制一份 light 主题。

**[P1] [体验] - Roadmap 节点不可拖动 (`draggable: false`)，丧失"建构感"**
- 位置：`src/renderer/components/roadmap/useDagreLayout.ts:84`
- 问题：dagre 自动布局 + 不可拖动 = 静态图。如果 roadmap 是核心资产，应该让用户能**亲手把节点拖到自己的心智模型里**——拖完保存 layout 到 localStorage。这是 Roam / Obsidian Graph View 给人"这是我的图"感觉的关键。
- 建议：开 `draggable: true` 并保存 user-level layout。一行配置改动。

### 内容 P1

**[P1] [内容] - T01 Decode 一律说成 memory-bound，但大 batch decode 可能 compute-bound**
- 位置：T01 (`Compute-bound vs Memory-bound`) bodyMd
- 问题：原文反复强调"Decode 阶段：单 token 路径常受权重读取和 KV 读取限制"，这对 batch=1 是对的。但**batch 维度上的 arithmetic intensity 累积**——同一份权重被 batch 里多个请求复用——使得大 batch decode 可以在 H100/910B 上变 compute-bound。"continuous batching 为什么有效" 的本质就是把 decode 推过 Roofline 拐点。原文的"常受...限制"虽然加了"常"字保留余地，但读者建立的心智模型会丢掉这一关键性。
- 建议：在 T01 加一段"为什么 batching 改变 bound"，并在 T06 Continuous Batching 处显式回扣这个推论。这同时给 T06 提供了"为什么有效"的物理解释，而不是孤立陈述。

**[P1] [内容] - T02 "笔记"类比丢失了 KV Cache 的本质（避免 O(n²) 重计算）**
- 位置：T02 bodyMd "把每个用户的上下文想成一本正在写的笔记"
- 问题：这个类比解释了"逐 token 累积"，但**完全没解释 KV Cache 为什么存在**。KV Cache 的本质不是"记录上下文"——上下文本身已经在 token 序列里了——而是"避免每生成一个 token 就重做一次 prefill"。说"笔记"会让读者形成一个非常常见的误解：以为 KV Cache 是为了"让模型看得到上文"。
- 建议：把类比换成**"KV Cache 是 prefill 阶段计算结果的复用"**，并配一个最简单的"无 cache 时每步要重算 N²、有 cache 时每步只算 N"的对比，1 行公式即可。

**[P1] [内容] - T06 PagedAttention "停车场"类比丢失了 prefix sharing**
- 位置：T06 bodyMd "停车场只能停固定长度的大车，空间会碎掉"
- 问题：这个类比抓的是"碎片化"。但 vLLM PagedAttention 的最大工程价值**不是消除碎片**——是 **block 级引用计数支持的 prefix sharing**：N 个用户共用同一个长 system prompt 时，prefix block 只需要存一份。在多租户 chatbot 场景下这是 5-20× 显存收益。停车场类比让读者错过了这个最有价值的性质。
- 建议：在 T06 显式加一段"PagedAttention 的两个收益：(1) 避免内部碎片；(2) prefix sharing 让多用户共用 block"。后者比前者重要得多。

**[P1] [内容] - T20/T21 缺少 sources 标注，恰恰是最易过时的内容**
- 位置：seed_data.json 中 T20 (Qwen3-Next) 和 T21 (DeepSeek V4) 的 sources 字段
- 问题：T02/T03 等基础概念有 `sources` + `[!FACT]` 标注，但 T20/T21 描述的是 2026 刚发布的型号、含具体参数（48 层、12×3 布局、CSA 4× 压缩、HCA 128× 压缩、1M 上下文、KV 是 V3.2 的 10%、FP4/FP8 量化策略），**这些数据最可能 2 个月内被官方 spec 修订**，反而完全没有 source URL + last_verified 日期。
- 建议：T20/T21 必须补 `sources` 字段，每个数值断言对应一条 source；建议在 `verify-sources.mjs` 脚本里加规则：包含具体数字（百分比、参数量、压缩比）的 topic 必须至少有一条 high-confidence source。

**[P1] [内容] - T01 Roofline 没有给出公式，只有概念**
- 位置：T01 bodyMd
- 问题：Roofline 的核心是 `Performance = min(Peak FLOPS, Bandwidth × Arithmetic Intensity)`。这是一行公式可以写完的。原文说"用目标硬件的算力(TFLOPS)和HBM带宽(TB/s)画出拐点"——但**拐点是怎么算出来的**根本没说。这是该有公式的地方逃避了。
- 建议：补三行：`Performance = min(P_peak, BW × AI)`、`AI = FLOPs / Bytes`、拐点 `AI* = P_peak / BW`。这三行直接让读者能**自己判断**任何 op 在任何硬件上是 compute-bound 还是 memory-bound——这正是 T01 自我宣称的产出（"理解了这个，MTP 为什么有效... 全部可以自行推导"）。

### 体验 P2

**[P2] [体验] - 状态切换有动作，没奖励**
- 位置：`TopicDetailView.tsx:133-146`
- 问题：点"已完成"后只是按钮变色 + sidebar 状态点变绿。Duolingo 在这种关键节点会做一次小庆祝（连胜++、经验值动画）。这不是说要做迪士尼级动画，但当前的"沉默切换"让"完成"这件事感觉像在打卡考勤。
- 建议：完成时插一个 600ms 的 Stage 进度条填充动画 + 一行"恭喜，本 stage 还差 X 个 topic 完成"。最低成本的反馈环。

**[P2] [体验] - 锚点目录没有"当前阅读章节"高亮**
- 位置：`TopicDetailView.tsx:118-130`、`styles.css:732+`
- 问题：长 topic（T20、T21 ~3000 字）滚动时，右侧目录卡片没有显示"我现在读到哪一节"。`scroll-margin-top: 96px` 已经处理了锚点跳转，但缺一个 IntersectionObserver 同步当前 active heading。
- 建议：加 `useActiveHeading` hook + `.toc-link.active` 样式。30 行代码。

**[P2] [体验] - CompactProgress 信息密度太低**
- 位置：`App.tsx:193-209`
- 问题：右上角进度条只显示总完成数。用户更想知道的是"当前 stage 完成了几个、下一个 stage 阻塞我吗"——这些数据 `ProgressSummary.stageProgress` 都有，但没用上。
- 建议：把 CompactProgress 拆成 4 个 stage 的迷你条（横向 4 段），每段独立着色。

**[P2] [内容] - bodyMd 风格是"PPT 翻译成 markdown"**
- 位置：所有 topic 的 bodyMd
- 问题：大量 H4 + 短句子 + 项目符号列表。这种结构是"幻灯片 outline"风格，不是"为屏幕长阅读优化"的散文。读起来眼睛要不停跳过缩进和符号，破坏沉浸。对比 Distill.pub：长段落 + 图表打断 + 公式行。
- 建议（如走选 A 路线）：从 T01/T02/T06 试点，把 H4 + 列表压成段落，每节最多一个图表/公式打断。

**[P2] [体验] - Sidebar 没有难度分布或预计耗时汇总**
- 位置：`Sidebar.tsx:10-47`
- 问题：用户进来想知道"S2 整个学完要多久"。`study_time_minutes` 字段已经有了，但 sidebar 没暴露。
- 建议：每个 stage 标题旁加 `(120 min · 5 topics)` 的小元信息。

---

## 3. TOP 5 优化优先级（按"价值/成本"排序）

| # | 标题 | 价值 | 成本 | 选这个的理由 |
|---|---|---|---|---|
| 1 | **决定走选 A 还是选 B 路线，砍掉与定位不符的元素** | 极高 | 0 元（决策成本） | 不解决战略问题再做任何细节都是把错的方向越走越深。这是 1 小时的会议产出。 |
| 2 | **T20/T21 补 sources + 给 verify-sources.mjs 加"含数字必须有 source"规则** | 高 | 4 小时 | 这是当前最可能埋雷的内容——错一个数字就直接破坏权威感，且 review 成本极低。 |
| 3 | **T01 加 Roofline 公式 + T02 改 KV Cache 类比 + T06 加 prefix sharing** | 高 | 4 小时 | 三处内容修改直接提升 T01/T02/T06 这三个最核心 topic 的"读完能产生新判断力"程度。这是产品的实质内容杠杆。 |
| 4 | **加 Ctrl+K 全文搜索 + per-topic 笔记字段** | 中-高 | 1 天 | 立即把产品从"一次性阅读器"变成"可重复回访的工具"。21 个 topic 现在还撑得住，下一批扩展（Phase 2 知识管理）必须有这两个能力打底。 |
| 5 | **T01 一个交互式 Roofline 组件（验证选 B 路线可行性）** | 极高（如果走通） | 2 天 | 这是最便宜的"原型 → 能不能做学习产品"验证。如果做完用户停留时间显著拉长，整个选 B 路线就值得继续投入；做完没有效果，就果断收回选 A 路线。 |

不选其他更"显眼"的（视觉重做、状态切换庆祝、TOC 高亮）的原因：那些是"已经走对方向后的打磨"，在战略未定之前做都是过早投入。

---

## 4. 互相矛盾或不一致的表述

经横向比对后发现的不一致：

1. **"主动学习"信号 vs 实际能力**——`TopicDetailView.tsx:189-198` "学习检查点" 卡片暗示读者要"自检"，但产品没有任何机制收集自检结果或推送下一次复习。这是 UI 承诺了交互、实现没接住。

2. **vLLM 在不同 topic 中的角色定位不一致**——T06 把 vLLM 描述为"推理引擎基座"（通用），T07 改口"vLLM 昇腾适配 + GTS 定制"（特定），T17 中 vLLM 又作为"全景架构的一层"出现（结构性）。三个角色之间没有统一的过渡说明，新读者难以建立稳定的"vLLM 在体系中是什么"心智。建议在 T06 开头加一段"vLLM 在本课程中的三层角色"导语。

3. **MTP 的"已落地"表述粒度不一**——T20 说"MTP 已在 Qwen3-Next 模型侧落地"（模型层面），T09 说 MTP 收益取决于"接受率、验证开销、调度形态"（运行时层面）。"模型侧落地" 与 "运行时是否能用" 是两件事，但读者很容易把两段读成"MTP 已经能用了"。建议 T20 改为"MTP 已在 Qwen3-Next 的 reference 实现中落地，但运行时（vLLM/vllm-ascend）的有效利用见 T09"。

4. **`learning-asset://` 协议白名单 vs 实际 seed 是否引用过任何图片**——`markdown.ts:78-82` 给图片做了 scheme 白名单允许 `learning-asset://`，但 seed_data.json 21 个 topic 是**全文本无图**。这意味着这条安全防线在实践中没有被任何内容触发，但代码和 styles.css 里花了篇幅处理它。这本身不是 bug，但反映了一个空洞——**所有 topic 都没有任何图、表、公式可视化**。这与"craft 级学习产品" 的差距是数量级的。

5. **状态机三态 vs 实际只有两个有意义的状态**——`not_started` 和 `in_progress` 在用户行为上几乎不可分（都是"没读完"），但 UI 给了同样的视觉权重。Brilliant/Duolingo 的"in_progress"对应的是真有过中断的会话，而这里完全没有"会话"概念。建议简化为二态（已读 / 未读），把腾出的 UI 空间用于"复习提示"。

---

## 5. 三句话总评

**最大的优势**：内容是一手手写的、来源标注扎实（T02/T03/T10 这种带 `[!FACT]` + sources 的章节质量很高）、技术细节准确度高（KV Cache 公式、MoE 总参/激活参区分、speculative decoding 平均接受 token 而非逐 token 接受率，这些常见错误都规避掉了）——**作为内容**它是认真的。

**最大的隐患**：定位错位。UI 在表演"学习产品"，本质是 Markdown 阅读器；这种错位会让用户在 5 分钟内失望，且任何 fork + LLM 的竞品都能复刻你的所有可见能力——**没有护城河**。

**唯一一条建议**：在加任何新功能之前，先开 1 小时会议决定"我们要做电子书还是学习产品"。决定前，停止打磨视觉、停止扩内容；决定后，砍掉不符合定位的所有元素。**走错的折中路线，再多迭代都救不回来**。
