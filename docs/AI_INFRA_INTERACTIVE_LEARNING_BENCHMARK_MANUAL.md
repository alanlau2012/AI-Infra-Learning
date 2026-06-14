# AI Infra 交互式学习产品标杆手册

> 版本：2026-06-13  
> 适用对象：企业内部 AI Infra、平台工程、推理系统、MLOps、GPU/异构算力团队  
> 目标：帮助其他公司设计一套“可落地、可维护、可验证”的内部交互式学习产品，而不是复制一个完整 LMS。

---

## 1. 手册结论

如果企业要建设面向工程团队的 AI Infra 学习产品，最值得借鉴的不是“课程平台有多少功能”，而是下面五类能力：

1. **真实工程路径**：像 NVIDIA Training 一样，把学习目标放在部署、运行、优化 AI/HPC 基础设施上。
2. **生态化内容组织**：像 Hugging Face Learn 一样，把课程、Cookbook、Notebook、工具生态串成学习入口。
3. **路线图和进度心智**：像 roadmap.sh 一样，让学习者知道自己在哪、下一步是什么、哪些能力是前置依赖。
4. **概念可视化交互**：像 Transformer Explainer 一样，用可操作的视觉系统解释模型机制。
5. **任务式即时反馈**：像 Learn Git Branching 一样，让学习者通过目标、操作、反馈、关卡推进建立技能。

推荐的产品形态是：

> **路线图驱动的轻量交互学习 App：每个知识点包含一段来源可信的正文、一个原生交互 Demo、一组工程判断要点、一个可视化进度状态。**

不建议一开始做账号系统、考试系统、证书系统、在线后端、错题本、内容编辑器或大型社区功能。这些功能会稀释第一阶段最关键的能力：让工程师快速建立正确的 AI Infra 心智模型。

---

## 2. 标杆筛选方法

本手册关注的是“企业内部工程学习产品”，不是泛教育平台。因此筛选标准如下。

### 2.1 必选条件

- 面向工程师或技术团队，而不是泛知识消费者。
- 有清晰的学习路径、课程结构、交互练习或可视化解释。
- 能给 AI Infra 学习产品带来可迁移的方法。
- 最好有公开页面、GitHub、论文、Demo 或课程入口可核验。

### 2.2 排除条件

- 只提供视频播放，没有交互、路径或工程实践。
- 只是内容管理系统，不体现技术学习设计。
- 主要价值在账号、运营、营销、证书，而不是学习本身。
- 需要大型后端或商业闭源平台才能复用的方法。

### 2.3 证据等级

本手册把信息分为两类：

- **公开证据**：来自项目官网、GitHub、论文、课程页等可访问资料。
- **产品推导**：基于公开证据，对企业内部学习产品的借鉴建议。

后文每个标杆都会分开写“公开证据”和“可迁移方法”，避免把推导误写成外部项目自己的声明。

---

## 3. Top 5 标杆总览

| 排名 | 标杆项目 | 类型 | 核心价值 | 最适合借鉴的部分 |
|---|---|---|---|---|
| 1 | NVIDIA AI and HPC Infrastructure Training | 官方训练体系 | AI/HPC 基础设施工程路径 | 学习路径、真实工具、部署和优化场景 |
| 2 | Hugging Face Learn / LLM Course | 开放课程生态 | 课程、Cookbook、生态库联动 | 内容入口、实践笔记本、生态化组织 |
| 3 | roadmap.sh Machine Learning Roadmap | 交互路线图 | 学习路径、进度心智、社区信号 | Roadmap 结构、前置依赖、个性化下一步 |
| 4 | Transformer Explainer | 交互可视化 | 在浏览器中解释 Transformer 内部机制 | 原生交互、层级切换、实时反馈 |
| 5 | Learn Git Branching | 任务式交互教程 | 可视化目标状态和即时反馈 | 关卡设计、操作练习、技能闭环 |

---

## 4. 标杆一：NVIDIA AI and HPC Infrastructure Training

### 4.1 公开证据

NVIDIA 的 AI and HPC Infrastructure Training 页面定位在 AI 与 HPC 基础设施训练。页面强调：

- 使用行业标准软件、工具和框架获得 hands-on 经验。
- 学习设计、部署、优化 AI infrastructure。
- 场景覆盖 healthcare、robotics、manufacturing 等行业。
- NVIDIA 站点同时把 AI Factory、AI Grid、Accelerated Computing、GPU Monitoring、NGC、Nsight 等基础设施相关能力放在产品与工具体系中。

参考链接：

- https://www.nvidia.com/en-us/training/academy/
- https://developer.nvidia.com/
- https://catalog.ngc.nvidia.com/

### 4.2 它做得好的地方

NVIDIA 的强点不是“页面好看”，而是学习内容天然绑定真实工程环境：

- 学习目标贴近生产问题：部署、扩展、优化、监控、算力效率。
- 内容不孤立讲概念，而是放在工具链和基础设施链路里。
- 学习对象不是单纯算法工程师，而是 AI 平台、HPC、数据中心和行业工程团队。
- 它把“学会一个概念”和“能在真实系统里用起来”连接起来。

### 4.3 可迁移方法

企业内部 AI Infra 学习产品可以借鉴以下结构：

| 模块 | 建议做法 |
|---|---|
| 学习路径 | 按真实生产链路组织：模型输入、推理引擎、调度、显存、通信、监控、故障定位 |
| 工程任务 | 每个 Topic 对应一个真实工程判断，例如“什么时候 P/D 分离收益大于 KV 传输成本” |
| 工具映射 | 每个知识点附带相关工具，如 vLLM、TensorRT-LLM、SGLang、CANN、Nsight、DCGM |
| 行业落地 | 使用公司内部场景，而不是通用玩具例子 |
| 验收标准 | 不以答题为主，而以“能否解释机制、判断瓶颈、选择方案”为主 |

### 4.4 不要照搬的部分

- 不要照搬 NVIDIA 的商业培训和认证体系，内部 MVP 阶段不需要证书。
- 不要把所有工具都堆进课程，先围绕本公司真实技术栈选 5-8 个核心点。
- 不要把内容写成厂商产品目录；内部学习产品应服务于工程判断力。

### 4.5 对 AI Infra Learning 的启发

当前项目已有 3 个 Stage、5 个 Topic 和 `interactive_demo`。后续可把每个 Topic 的定位从“知识讲解”进一步升级为“工程判断训练”：

- T01：从 AI Infra 全景图，进入“请求在系统中如何流动”。
- T02：从 KV Cache/PagedAttention，进入“显存碎片和共享前缀如何影响吞吐”。
- T03：从 batching/prefill，进入“吞吐、TTFT、TPOT 的取舍”。
- T04：从 Ascend operator，进入“搬运、计算、流水线哪里是瓶颈”。
- T05：从 distributed inference，进入“P/D 分离什么时候值得做”。

---

## 5. 标杆二：Hugging Face Learn / LLM Course

### 5.1 公开证据

Hugging Face Learn 页面聚合了多条课程与实践入口，包括 LLM Course、Context Course、Agents Course、Deep RL Course、Audio Course、Diffusion Course、Open-Source AI Cookbook 等。

参考链接：

- https://huggingface.co/learn
- https://huggingface.co/learn/llm-course
- https://huggingface.co/learn/cookbook

### 5.2 它做得好的地方

Hugging Face 的关键价值是“生态化学习入口”：

- 学习内容和真实库、模型、数据集、Space、Notebook 互相连接。
- 课程不是孤立教材，而是进入生态工具链的路径。
- Cookbook 适合解决具体任务，Course 适合建立体系。
- 它允许不同水平的人从不同入口进入：课程、示例、Notebook、模型页面。

### 5.3 可迁移方法

内部 AI Infra 学习产品可以把内容分成三层：

| 层级 | 作用 | 示例 |
|---|---|---|
| Course | 建立系统认知 | 推理系统主链路、显存管理、调度、异构算子 |
| Cookbook | 解决具体问题 | 如何判断 TTFT 异常、如何定位 KV cache 爆显存、如何选择 batch 策略 |
| Reference | 保留权威依据 | 官方文档、论文、源码链接、内部最佳实践 |

### 5.4 推荐的信息架构

每个 Topic 建议包含：

```text
Topic
├─ 一句话目标：学完能判断什么
├─ 背景问题：生产中为什么会遇到
├─ 机制解释：核心原理
├─ Interactive Demo：用交互建立直觉
├─ 工程判断：什么时候用、什么时候不用
├─ 常见误区：最容易错在哪里
├─ 参考来源：官方文档、论文、源码、内部案例
└─ 下一步：关联 Topic 或 Cookbook
```

### 5.5 不要照搬的部分

- 不要把内部学习产品做成“外部生态导航站”。
- 不要堆太多链接；链接要服务于当前 Topic 的学习目标。
- 不要把 Notebook 作为唯一交互形式；对非算法岗位，原生可视化 Demo 通常更快建立共同语言。

### 5.6 对 AI Infra Learning 的启发

当前项目的 `resources/source-snapshots` 已经能承接 Reference 层。建议后续新增一类轻量内容，不一定进入 Phase 2 大功能：

- `工程判断`：写在 Topic 正文内。
- `常见误区`：写在 Topic 正文内。
- `来源快照`：继续放在 `resources/source-snapshots/*.md`。
- `Cookbook`：暂不做独立系统，只在 Topic 末尾用“遇到这个问题时看什么”呈现。

---

## 6. 标杆三：roadmap.sh Machine Learning Roadmap

### 6.1 公开证据

roadmap.sh 的 Machine Learning Roadmap 页面提供 step-by-step guide，并展示 Roadmap、AI Tutor、Personalize、Community 等入口。页面同时显示 GitHub stars、注册用户、Discord 成员等社区指标。

参考链接：

- https://roadmap.sh/machine-learning
- https://github.com/kamranahmedse/developer-roadmap

### 6.2 它做得好的地方

roadmap.sh 的核心不是内容深度，而是“学习路径心智”：

- 学习者能看到全局地图。
- 每个节点都有位置感和前置关系。
- 学习进度是可见的。
- 社区和星标给学习者信任感。
- 个性化入口降低“下一步学什么”的决策成本。

### 6.3 可迁移方法

企业内部学习产品的 Roadmap 不应只是目录树，而应该回答四个问题：

1. 我现在在哪个能力域？
2. 这个知识点的前置知识是什么？
3. 学完它能解决什么工程问题？
4. 下一步最应该学什么？

推荐的 Roadmap 节点字段：

| 字段 | 说明 |
|---|---|
| `stage` | 学习阶段，例如“推理链路入门”“性能机制”“分布式部署” |
| `topic` | 具体知识点 |
| `status` | 未开始、进行中、已完成 |
| `depends_on` | 前置 Topic |
| `unlocks` | 学完后解锁的理解能力 |
| `production_question` | 对应的生产问题 |
| `demo_kind` | 关联的交互 Demo 类型 |

### 6.4 不要照搬的部分

- 不要一开始做大而全的职业路线图。
- 不要让 Roadmap 变成密密麻麻的知识点清单。
- 不要引入复杂社区功能；内部 MVP 更需要“路径清晰”和“学习状态可信”。

### 6.5 对 AI Infra Learning 的启发

当前项目已有 Roadmap 视图和进度统计。建议后续把节点文案从“课程目录”升级为“能力路径”：

| 当前表达 | 建议升级 |
|---|---|
| Topic 名称 | Topic 名称 + 工程问题 |
| Stage 分组 | Stage 分组 + 能力目标 |
| 完成状态 | 完成状态 + 下一个推荐 Topic |
| Roadmap 图 | Roadmap 图 + 前置依赖解释 |

示例：

```text
T03 Batching 与 Chunked Prefill
工程问题：为什么吞吐提高后，首 token 延迟可能变差？
前置：T02 KV Cache
下一步：T05 P/D 分离
```

---

## 7. 标杆四：Transformer Explainer

### 7.1 公开证据

Transformer Explainer 是 Georgia Tech Polo Club 的开源交互可视化项目。GitHub 页面说明它是帮助用户理解 Transformer/GPT 的交互式可视化工具，可以在浏览器中运行 live GPT-2，让用户输入自己的文本，并实时观察 Transformer 内部组件如何协同预测下一个 token。相关论文也说明该工具支持从模型概览到数学运算和模型结构的抽象层级切换，并提供 YouTube demo。

参考链接：

- https://github.com/poloclub/transformer-explainer
- https://poloclub.github.io/transformer-explainer/
- https://arxiv.org/abs/2408.04619
- https://youtu.be/ECR4oAwocjs

### 7.2 它做得好的地方

Transformer Explainer 的关键不是“动画多”，而是它把抽象机制拆成可观察的层级：

- 用户输入会真实影响可视化结果。
- 模型内部组件不是静态插图，而是随输入发生变化。
- 同一个主题可以从宏观结构逐步下钻到局部计算。
- 用户能通过试错形成直觉。
- 不需要安装复杂环境，降低学习门槛。

### 7.3 可迁移方法

AI Infra 主题也可以做类似“机制可视化”，但不一定要真实运行大模型。关键是建立正确的定性响应：

| AI Infra 主题 | 可视化对象 | 用户可操作参数 | 应展示的机制 |
|---|---|---|---|
| KV Cache | token 增长、KV block、显存占用 | 序列长度、共享前缀、并发请求 | KV 复用、碎片、显存压力 |
| Batching | 请求队列、prefill、decode | 请求速率、batch size、chunk size | 吞吐与延迟取舍 |
| PagedAttention | block table、物理块、逻辑序列 | block size、请求长度分布 | 非连续内存管理 |
| Ascend Operator | CopyIn、Compute、CopyOut | tile 大小、buffer 数量 | 搬运和计算流水线 |
| P/D 分离 | prefill pool、decode pool、KV transfer | 请求并发、网络带宽 | 分离收益和传输成本 |

### 7.4 交互设计原则

一个好的机制 Demo 至少满足：

- **输入可变**：用户能改变一个关键参数。
- **响应可信**：指标变化符合机制，不是随机动画。
- **层级清晰**：先看整体，再看局部。
- **文案短**：每一步只解释一个机制点。
- **状态稳定**：同样输入得到同样结果，便于讨论。
- **无过度拟真**：不是 benchmark，不要伪造精确数字。

### 7.5 不要照搬的部分

- 不要为了“真实运行模型”牺牲内部 Electron App 的简单性。
- 不要把所有底层计算都可视化；AI Infra 学习更需要机制抓手。
- 不要让交互进入 Markdown HTML；安全边界应保持在原生 React 组件内。

### 7.6 对 AI Infra Learning 的启发

当前项目的 `InteractiveLesson.tsx` 是正确方向。后续打磨重点应放在：

- 每个 `kind` 的指标响应必须有机制依据。
- 每个 step 的解释要能回答“发生了什么”和“为什么重要”。
- 自动播放应像一段轻量教学动画，而不是轮播装饰。
- 参数滑动不应制造伪精确感，应标注为“示意”。

---

## 8. 标杆五：Learn Git Branching

### 8.1 公开证据

Learn Git Branching 是开源的 Git 可视化交互教程。GitHub 页面说明它是 interactive git visualization and tutorial，学习者可以用它练习并挑战自己掌握 Git。该项目采用 MIT License，GitHub 页面显示约 33.6k stars。

参考链接：

- https://github.com/pcottle/learnGitBranching
- https://pcottle.github.io/learnGitBranching/

### 8.2 它做得好的地方

Learn Git Branching 的核心是“任务闭环”：

- 给学习者一个明确目标状态。
- 学习者输入操作。
- 系统即时更新可视化状态。
- 如果达到目标，就进入下一关。
- 学习者通过操作而不是阅读建立能力。

### 8.3 可迁移方法

AI Infra 学习也可以引入轻量任务闭环，但要注意 MVP 边界。可以先不做判分系统，只做“目标状态提示 + 可视化反馈”：

| Git Branching 模式 | AI Infra 迁移方式 |
|---|---|
| 目标 commit graph | 目标系统状态，例如“降低 decode 尾延迟” |
| 输入 git 命令 | 调整 batch/chunk/并发/带宽等参数 |
| 图变化 | 队列、显存、吞吐、延迟变化 |
| 关卡通过 | 学习者能解释为什么这个选择更好 |

### 8.4 适合内部学习的任务模板

```text
任务标题：让长短请求混合场景下的 decode 更稳定

背景：
线上请求长度差异大，静态 batch 导致部分短请求等待过久。

目标：
在不明显牺牲吞吐的情况下，降低尾部 decode 延迟。

可操作参数：
- batch size
- chunked prefill 开关
- chunk size
- 并发请求强度

反馈：
- throughput：上升/下降
- TTFT：上升/下降
- TPOT：上升/下降
- queue pressure：上升/下降

学习者应形成的判断：
chunked prefill 可以缓解 decode 饥饿，但 chunk 太小会增加调度开销，chunk 太大又会重新阻塞 decode。
```

### 8.5 不要照搬的部分

- 不要第一阶段做严格判分和闯关。
- 不要让学习者输入复杂命令；AI Infra 学习更适合滑杆、开关、分步切换。
- 不要让任务闭环成为考试系统；它首先是教学交互。

---

## 9. 五个标杆的可迁移模式

### 9.1 模式一：从“目录”升级为“路径”

差的学习产品是目录：

```text
1. KV Cache
2. PagedAttention
3. Batching
4. P/D 分离
```

好的学习产品是路径：

```text
为了理解推理服务为什么会慢：
1. 先看请求如何进入推理系统
2. 再看 token 生成为什么需要 KV Cache
3. 再看显存如何限制并发
4. 再看 batching 如何提高吞吐但影响延迟
5. 最后看 P/D 分离如何在高并发下重排资源
```

### 9.2 模式二：每个 Topic 绑定一个生产问题

每个 Topic 都应能回答一个真实问题：

| Topic | 生产问题 |
|---|---|
| AI Infra 全景 | 一个请求从网关到 token 输出经历了哪些组件？ |
| KV Cache | 为什么上下文变长后显存会快速成为瓶颈？ |
| Batching | 为什么吞吐和首 token 延迟经常互相拉扯？ |
| Ascend Operator | 为什么算力充足时性能仍可能卡在搬运？ |
| P/D 分离 | 为什么分离 prefill/decode 不是默认总更快？ |

### 9.3 模式三：交互 Demo 只承担一个教学目标

一个 Demo 不要同时解释太多东西。建议每个 Demo 只回答一个核心问题：

- KV Demo：显存为什么涨，PagedAttention 为什么有用。
- Batching Demo：吞吐为什么涨，延迟为什么可能变差。
- Ascend Operator Demo：CopyIn/Compute/CopyOut 如何组成流水线。
- P/D Demo：分离收益和 KV 传输成本如何对冲。

### 9.4 模式四：公开来源和内部判断分层

内容可信度要靠结构保证：

```text
公开来源：
- 官方文档
- 论文
- GitHub README
- 技术博客

内部判断：
- 本公司推荐配置
- 本公司实践经验
- 本公司场景取舍
- 本公司故障复盘
```

不要把内部经验伪装成行业事实。反过来，也不要让公开资料替代本公司的工程判断。

### 9.5 模式五：先做轻量闭环，再做复杂系统

推荐演进顺序：

1. 静态内容 + 来源。
2. Roadmap + 学习状态。
3. 原生交互 Demo。
4. 工程判断题或场景讨论。
5. 可选的任务练习。
6. 可选的团队学习数据。
7. 可选的考试、证书、内容编辑器。

---

## 10. 推荐产品蓝图

### 10.1 MVP 范围

第一阶段建议只做：

- 3-5 个 Stage。
- 5-8 个核心 Topic。
- 每个 Topic 一个原生交互 Demo。
- Markdown 正文和来源信息。
- Roadmap 视图。
- 本地学习进度。
- 主题设置。

不做：

- 用户账号。
- 在线后端。
- 考试系统。
- 证书。
- 错题本。
- 内容编辑器。
- 导入导出。
- 多端同步。

### 10.2 推荐 Topic 结构

```json
{
  "id": "T03",
  "stage": "推理性能机制",
  "name": "Batching 与 Chunked Prefill",
  "goal": "理解吞吐、TTFT、TPOT 的取舍",
  "production_question": "为什么吞吐提高后，首 token 延迟可能变差？",
  "key_points": [
    "prefill 和 decode 的资源形态不同",
    "batching 提高吞吐但可能增加等待",
    "chunked prefill 可以缓解 decode 饥饿"
  ],
  "interactive_demo": {
    "kind": "batching_prefill",
    "steps": [
      "静态 batch",
      "连续补位",
      "chunked prefill",
      "延迟与吞吐平衡"
    ]
  },
  "sources": [
    "官方文档或论文链接"
  ]
}
```

### 10.3 推荐页面布局

```text
┌─────────────────────────────────────────────────────────────┐
│ 顶部：Topic 名称、Stage、学习状态、主题切换                  │
├───────────────┬─────────────────────────────────────────────┤
│ 左侧：路径导航 │ 右侧：Topic Detail                         │
│               │ ┌─────────────────────────────────────────┐ │
│ Stage 1       │ │ Interactive Demo                         │ │
│  T01          │ │ - step 控制                              │ │
│  T02          │ │ - 参数控件                               │ │
│ Stage 2       │ │ - 机制可视化                             │ │
│  T03          │ │ - 指标变化                               │ │
│               │ └─────────────────────────────────────────┘ │
│               │ 正文 Markdown                               │
│               │ 来源与延伸阅读                              │
└───────────────┴─────────────────────────────────────────────┘
```

### 10.4 推荐交互组件标准

每个交互 Demo 都应满足：

- 有 3-5 个 step。
- 每个 step 只讲一个机制。
- 至少一个可操作参数。
- 指标变化定性正确。
- 有自动播放。
- 有手动切换。
- 移动或窄窗口不遮挡正文。
- 深色/浅色主题都可读。

---

## 11. 内容生产 SOP

### 11.1 每个 Topic 的写作流程

1. 定义生产问题。
2. 列出学习者应形成的判断。
3. 收集公开来源。
4. 写 source snapshot。
5. 写正文。
6. 设计交互 Demo。
7. 检查术语和指标是否夸大。
8. 做实窗 QA。

### 11.2 推荐 source snapshot 模板

```markdown
# Txx Source Snapshot

## Topic

<Topic 名称>

## Verified Facts

| 事实 | 来源 | 用于正文哪里 |
|---|---|---|
| ... | ... | ... |

## Assumptions

| 推导 | 为什么需要 | 风险 |
|---|---|---|
| ... | ... | ... |

## Do Not Claim

- 不要声称某个参数在所有场景最优。
- 不要声称示意指标是 benchmark 结果。
- 不要把内部经验写成行业事实。
```

### 11.3 正文写作标准

每个 Topic 正文建议包含：

```markdown
## 你会遇到什么问题

## 这个机制解决什么

## 它如何工作

## 交互 Demo 该怎么看

## 工程判断

## 常见误区

## 来源
```

### 11.4 文案风格

推荐：

- 直接写工程问题。
- 多用“什么时候”“为什么”“代价是什么”。
- 对精确数字保持克制。
- 明确写“示意”“定性”“取决于场景”。

避免：

- 大段概念堆砌。
- 口号式“显著提升性能”。
- 没有来源的型号、参数、比例。
- 把所有内容都写成 Markdown 图片或静态图。

---

## 12. 交互 Demo 设计指南

### 12.1 Demo 不是小游戏

AI Infra 学习里的交互 Demo 主要目标是建立机制直觉，不是娱乐、考试或仿真。

好的 Demo：

- 让学习者看到因果关系。
- 让学习者能解释指标为什么变化。
- 让学习者理解取舍。

不好的 Demo：

- 数字跳动但没有机制。
- 动画很复杂但学习者不知道看哪里。
- 参数很多但没有教学目标。

### 12.2 指标设计

建议使用少量稳定指标：

| 指标 | 适用场景 | 注意事项 |
|---|---|---|
| Throughput | batching、P/D、operator pipeline | 标注为相对值或示意值 |
| TTFT | prefill、chunked prefill | 不要伪造真实毫秒 |
| TPOT | decode、P/D 分离 | 强调趋势，不强调绝对值 |
| KV Memory | KV cache、PagedAttention | 展示增长趋势和碎片 |
| Queue Pressure | 调度、batching | 用于解释等待和尾延迟 |
| Transfer Cost | P/D 分离 | 强调网络/互联成本 |

### 12.3 Step 设计

每个 step 的解释建议采用三句结构：

```text
发生了什么：系统从静态 batch 切到连续补位。
为什么重要：短请求不必一直等待长请求结束。
你应建立的直觉：吞吐可能上升，但调度和延迟取舍仍存在。
```

### 12.4 参数设计

推荐参数类型：

- 并发强度：低/中/高。
- 序列长度：短/中/长。
- batch 大小：小/中/大。
- chunk 大小：小/中/大。
- 网络带宽：低/中/高。

不建议一开始暴露：

- 过多真实内核参数。
- 复杂调度策略组合。
- 需要专业背景才能理解的硬件寄存器或编译选项。

---

## 13. 企业内部落地路线

### 13.1 0-2 周：确定首批学习闭环

产出：

- 目标用户画像。
- 5 个 Topic。
- 每个 Topic 的生产问题。
- 每个 Topic 的来源清单。
- Roadmap 草图。

验收：

- 一位平台工程师能确认这些 Topic 是真实高频问题。
- 一位非核心 Infra 背景的研发能看懂路径。

### 13.2 3-6 周：实现 MVP

产出：

- 本地桌面 App 或 Web App。
- Topic 列表和详情页。
- Roadmap。
- 学习状态持久化。
- 1-2 个高质量交互 Demo。

验收：

- 新人能在 30 分钟内讲清一个机制。
- 老工程师认为 Demo 的定性响应没有误导。
- 内容来源可追溯。

### 13.3 7-10 周：扩展到完整第一版

产出：

- 5-8 个 Topic 全部完成。
- 每个 Topic 有交互 Demo。
- 每个 Topic 有来源快照。
- QA 和测试流程稳定。

验收：

- 内部试点团队完成学习。
- 收集误区反馈并修正文案。
- 明确下一阶段是否需要任务练习或团队数据。

### 13.4 10 周后：谨慎扩展

可以考虑：

- 场景练习。
- 轻量判断题。
- 团队学习报告。
- 内部最佳实践 Cookbook。

仍需谨慎：

- 证书。
- 排行榜。
- 重型考试。
- 内容编辑后台。
- 多端同步。

---

## 14. 评估指标

### 14.1 学习效果指标

| 指标 | 判断方式 |
|---|---|
| 机制解释能力 | 学习者能否不用背诵，解释指标变化原因 |
| 工程判断能力 | 学习者能否说出某方案适用和不适用场景 |
| 误区减少 | 学习前后常见错误是否减少 |
| 路径完成率 | 学习者是否能顺着 Roadmap 完成核心路径 |
| 复用率 | Topic 是否在 onboarding、分享、故障复盘中被引用 |

### 14.2 产品质量指标

| 指标 | 判断方式 |
|---|---|
| 内容可信度 | 每个关键事实是否有来源 |
| 交互可信度 | 指标响应是否定性正确 |
| 使用成本 | 是否无需复杂环境即可运行 |
| 维护成本 | 新增 Topic 是否只需改内容和少量组件 |
| 安全边界 | Markdown、IPC、本地文件访问是否受控 |

### 14.3 不建议过早追踪的指标

- 日活。
- 学习时长。
- 排行榜。
- 证书数量。
- 题目正确率。

这些指标容易把产品推向运营系统，而不是工程学习系统。

---

## 15. 反模式清单

### 15.1 内容反模式

- 只讲术语，不讲生产问题。
- 只堆论文，不讲工程取舍。
- 只写“提升性能”，不写代价。
- 把内部经验写成普适事实。
- 用无法核验的型号和数字制造权威感。

### 15.2 交互反模式

- 动画很炫但指标没有机制依据。
- 一个 Demo 同时讲 5 个知识点。
- 参数很多但没有清晰教学目标。
- 每一步解释太长，用户无法边看边理解。
- 把交互塞进 Markdown HTML，破坏安全边界。

### 15.3 产品反模式

- 第一版就做完整 LMS。
- 先做账号、证书、后台，再做内容质量。
- Roadmap 只是目录，没有前置关系。
- 学习状态复杂但学习目标不清晰。
- 为了可扩展性提前引入数据库、后端和迁移系统。

---

## 16. 推荐给其他公司的实施清单

### 16.1 启动前检查

- [ ] 是否明确目标用户：平台工程师、算法工程师、应用研发、SRE？
- [ ] 是否明确第一版不做什么？
- [ ] 是否有 5 个真实高频生产问题？
- [ ] 是否有愿意 review 内容的资深工程师？
- [ ] 是否能访问权威来源和内部最佳实践？

### 16.2 Topic 检查

- [ ] 每个 Topic 有一个生产问题。
- [ ] 每个 Topic 有 3-5 个关键点。
- [ ] 每个 Topic 有来源。
- [ ] 每个 Topic 有常见误区。
- [ ] 每个 Topic 有一个轻量交互 Demo 或可视化解释。

### 16.3 Demo 检查

- [ ] Demo 的指标响应定性正确。
- [ ] Demo 不声称自己是 benchmark。
- [ ] 参数数量不超过学习者可理解范围。
- [ ] 自动播放和手动切换都可用。
- [ ] 深色/浅色主题可读。
- [ ] 窄窗口不遮挡。

### 16.4 发布前检查

- [ ] 所有关键事实有来源。
- [ ] 所有内部推导被标注为内部判断。
- [ ] 新人试用能完成核心路径。
- [ ] 资深工程师 review 没有发现机制误导。
- [ ] 安全边界没有因交互功能被放宽。

---

## 17. 针对当前 AI Infra Learning 项目的建议

当前项目已经具备一个合适的第一版骨架：

- Electron + React + TypeScript。
- 3 个 Stage、5 个 Topic。
- `interactive_demo` 字段。
- `InteractiveLesson.tsx` 原生 React 交互。
- Markdown 正文和 sources。
- Roadmap。
- 本地 progress/settings JSON。

短期建议只做三件事：

1. **把每个 Demo 的机制响应打磨正确**  
   重点检查 `buildMetrics` 或等价逻辑，避免“看起来会动，但学不到东西”。

2. **把每个 step 的解释扩成教学级文案**  
   每一步都写清楚“发生了什么、为什么重要、应该建立什么直觉”。

3. **把 Roadmap 节点从目录升级为工程问题**  
   让学习者看到 Topic 之间的前置关系和生产意义。

暂时不建议做：

- gate 判分。
- 决策沙盘。
- 考试系统。
- 内容编辑器。
- 在线同步。

这些可以作为后续阶段单独开 spec，不应混入当前轻量交互学习主线。

---

## 18. 参考来源

### 18.1 标杆项目

- NVIDIA AI and HPC Infrastructure Training  
  https://www.nvidia.com/en-us/training/academy/

- Hugging Face Learn  
  https://huggingface.co/learn

- Hugging Face LLM Course  
  https://huggingface.co/learn/llm-course

- Hugging Face Open-Source AI Cookbook  
  https://huggingface.co/learn/cookbook

- roadmap.sh Machine Learning Roadmap  
  https://roadmap.sh/machine-learning

- developer-roadmap GitHub  
  https://github.com/kamranahmedse/developer-roadmap

- Transformer Explainer GitHub  
  https://github.com/poloclub/transformer-explainer

- Transformer Explainer Demo  
  https://poloclub.github.io/transformer-explainer/

- Transformer Explainer Paper  
  https://arxiv.org/abs/2408.04619

- Transformer Explainer YouTube Demo  
  https://youtu.be/ECR4oAwocjs

- Learn Git Branching GitHub  
  https://github.com/pcottle/learnGitBranching

- Learn Git Branching Demo  
  https://pcottle.github.io/learnGitBranching/

### 18.2 使用说明

以上来源用于标杆拆解和方法抽象。具体落地到企业内部时，应替换为本公司真实技术栈、内部故障复盘、平台最佳实践和已核验的官方资料。

