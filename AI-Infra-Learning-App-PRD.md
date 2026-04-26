# AI Infra 知识点学习系统 — 产品需求文档（PRD）

> **版本**: v1.0  
> **日期**: 2026-04-26  
> **负责人**: Alan Lau — GTS AI PDU Technical Leader  
> **目标用户**: GTS AI Infra 团队新人及核心成员（约 40 人）

---

## 1. 产品定位

面向 GTS AI Infra 团队的内部知识管理与学习系统。以结构化知识点为核心，覆盖从大模型推理第一性原理到 MaaS 平台全栈架构的 21 个专题，支持自主学习、知识沉淀和考核验证。

**一句话描述**：一个让团队成员能系统性掌握昇腾 AI 推理全栈知识的学习 + 考试 App。

---

## 2. 目标平台

| 平台 | 技术方案 | 备注 |
|------|---------|------|
| 本地 PC（Windows/Mac） | Electron 桌面应用 或 本地 Web 服务（Python Flask/FastAPI + 浏览器） | 优先推荐 Electron，体验更好 |
| Android 手机 | Flutter 或 React Native 跨平台方案 | 与 PC 端共享后端 API 和数据格式 |

**数据同步策略**：本地 SQLite 存储为主，未来可选扩展为局域网内 API Server 做多端同步。MVP 阶段各端独立本地数据库即可。

---

## 3. 功能模块

### 3.1 知识点学习模块

**核心功能**：按学习路线图浏览和学习知识点。

- 左侧导航树：按 Stage（阶段）→ Topic（专题）两级展示
- 主内容区：展示当前专题的详细学习内容
- 每个专题卡片包含以下信息字段：
  - 专题编号（T01-T21）
  - 所属阶段（S1-S4）
  - 专题名称
  - 学习时长（分钟）
  - 难度等级（1-3 星）
  - 前置依赖（prerequisite 专题列表）
  - **为什么重要**（why）— 一段话说明该知识点对管理者/工程师的决策价值
  - **关键知识点**（key_points）— 5-7 个核心要点，每个要点 1-2 句话
  - **实战关联**（real_world_connection）— 与 GTS 平台实际业务的关联说明
  - **学习状态**（未学习 / 学习中 / 已完成）
- 路线图可视化视图：用有向图（DAG）展示 21 个专题的依赖关系和推荐学习路径
- 进度统计：已完成 / 总数、各阶段完成百分比

### 3.2 知识管理模块

**核心功能**：管理员（Alan）可增删改知识点内容。

- 新增专题：填写上述所有字段，指定所属 Stage 和依赖关系
- 编辑专题：修改任意字段内容
- 删除专题：支持软删除（标记删除，不物理移除）
- 调整阶段结构：新增/编辑/删除 Stage
- 导入/导出：支持 JSON 格式批量导入导出全部知识点数据
- 批量初始化：首次启动时从内置 JSON 文件加载 21 个预设专题

### 3.3 考试模块

**核心功能**：针对已学习的知识点进行自测验证。

- 题目类型：
  - **单选题**：4 个选项
  - **多选题**：4-6 个选项
  - **判断题**：对/错
  - **简答题**：文本输入，人工自评（标记"掌握/未掌握"）
- 出题方式：
  - 按专题出题：选择 1 个或多个专题，从题库中随机抽取
  - 按阶段出题：选择 1 个阶段，覆盖该阶段所有专题
  - 综合测试：从全部已学习专题中按比例抽取
- 题库管理：
  - 每个专题关联一组试题
  - 管理员可手动录入题目
  - 支持 JSON 批量导入题目
- 考试结果：
  - 即时评分（客观题自动判分，简答题手动标记）
  - 错题回顾：记录历史错题，支持错题重练
  - 成绩统计：按专题/阶段维度的正确率图表

---

## 4. 数据模型（SQLite）

### 4.1 stages 表 — 学习阶段

```sql
CREATE TABLE stages (
    id          TEXT PRIMARY KEY,       -- 'S1', 'S2', 'S3', 'S4'
    name        TEXT NOT NULL,          -- '第一性原理'
    description TEXT,                   -- 阶段总述
    sort_order  INTEGER NOT NULL,       -- 排序序号
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 topics 表 — 知识专题

```sql
CREATE TABLE topics (
    id                    TEXT PRIMARY KEY,       -- 'T01' ~ 'T21'
    stage_id              TEXT NOT NULL,          -- 外键 → stages.id
    name                  TEXT NOT NULL,          -- 专题名称
    sort_order            INTEGER NOT NULL,       -- 阶段内排序
    difficulty            INTEGER DEFAULT 2,      -- 1=基础, 2=进阶, 3=高级
    study_time_minutes    INTEGER DEFAULT 30,     -- 预计学习时长
    why                   TEXT,                   -- 为什么重要
    real_world_connection TEXT,                   -- 实战关联
    study_status          TEXT DEFAULT 'not_started', -- not_started / in_progress / completed
    is_deleted            INTEGER DEFAULT 0,      -- 软删除标记
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);
```

### 4.3 key_points 表 — 关键知识点

```sql
CREATE TABLE key_points (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id   TEXT NOT NULL,           -- 外键 → topics.id
    content    TEXT NOT NULL,           -- 知识点内容
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);
```

### 4.4 prerequisites 表 — 前置依赖

```sql
CREATE TABLE prerequisites (
    topic_id        TEXT NOT NULL,       -- 当前专题
    prerequisite_id TEXT NOT NULL,       -- 前置专题
    PRIMARY KEY (topic_id, prerequisite_id),
    FOREIGN KEY (topic_id) REFERENCES topics(id),
    FOREIGN KEY (prerequisite_id) REFERENCES topics(id)
);
```

### 4.5 questions 表 — 题库

```sql
CREATE TABLE questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id        TEXT NOT NULL,
    question_type   TEXT NOT NULL,       -- 'single_choice' / 'multi_choice' / 'true_false' / 'short_answer'
    question_text   TEXT NOT NULL,       -- 题目内容
    options         TEXT,                -- JSON 数组: ["选项A", "选项B", "选项C", "选项D"]
    correct_answer  TEXT NOT NULL,       -- 单选: "A"；多选: "A,C"；判断: "true"/"false"；简答: 参考答案
    explanation     TEXT,                -- 答案解析
    is_deleted      INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);
```

### 4.6 exam_records 表 — 考试记录

```sql
CREATE TABLE exam_records (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_type       TEXT NOT NULL,       -- 'topic' / 'stage' / 'comprehensive'
    scope           TEXT,                -- 考试范围: 专题ID列表或阶段ID
    total_questions  INTEGER NOT NULL,
    correct_count   INTEGER DEFAULT 0,
    score           REAL DEFAULT 0,      -- 百分制得分
    started_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at     DATETIME
);
```

### 4.7 exam_answers 表 — 答题明细

```sql
CREATE TABLE exam_answers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id         INTEGER NOT NULL,
    question_id     INTEGER NOT NULL,
    user_answer     TEXT,                -- 用户作答
    is_correct      INTEGER,             -- 0/1，简答题手动标记
    FOREIGN KEY (exam_id) REFERENCES exam_records(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

---

## 5. 初始化数据（21 个专题）

首次启动时从以下 JSON 结构初始化数据库。完整 JSON 作为单独文件 `seed_data.json` 随应用打包。

```json
{
  "stages": [
    {
      "id": "S1",
      "name": "第一性原理",
      "sort_order": 1,
      "description": "用算力和带宽的视角理解LLM推理，所有架构决策和优化技术的底层逻辑"
    },
    {
      "id": "S2",
      "name": "昇腾硬件与推理引擎",
      "sort_order": 2,
      "description": "理解硬件平台和推理引擎核心机制，工程优化的物理约束和技术基座"
    },
    {
      "id": "S3",
      "name": "推理优化与服务化",
      "sort_order": 3,
      "description": "从单引擎优化到生产级服务系统，涵盖性能优化、指标体系、网关路由和流量治理"
    },
    {
      "id": "S4",
      "name": "平台与战略",
      "sort_order": 4,
      "description": "从技术全栈到平台思维和战略定位，理解MaaS平台的整体价值和竞争力来源"
    }
  ],
  "topics": [
    {
      "id": "T01",
      "stage_id": "S1",
      "name": "Compute-bound vs Memory-bound：推理的第一性原理",
      "sort_order": 1,
      "difficulty": 2,
      "study_time_minutes": 45,
      "prerequisites": [],
      "why": "所有推理优化决策的根基。理解了这个，MTP为什么有效、batching为什么重要、P/D分离为什么必要，全部可以自行推导",
      "key_points": [
        "Arithmetic Intensity（算术强度）= FLOPs / Bytes，是判断瓶颈的核心指标",
        "Prefill阶段：大矩阵乘（[seq_len, d] × [d, d]），compute-bound，算力是瓶颈",
        "Decode阶段：每步只处理1个token，但需要把全部模型权重从HBM搬一遍，memory-bound，带宽是瓶颈",
        "Roofline Model：用910B3的算力(TFLOPS)和HBM带宽(TB/s)画出拐点，低于拐点就是在等数据搬运",
        "一句话：Decode阶段NPU大部分时间在搬数据而不是在算，所有优化本质上都是在提高每次搬运的产出"
      ],
      "real_world_connection": "MTP能把并发从1200提升到3000+，因为一次权重搬运产出多个token，直接提升memory-bound场景的效率"
    },
    {
      "id": "T02",
      "stage_id": "S1",
      "name": "KV Cache与显存计算",
      "sort_order": 2,
      "difficulty": 2,
      "study_time_minutes": 40,
      "prerequisites": ["T01"],
      "why": "KV Cache大小直接决定集群能服务多少并发用户，是容量规划、硬件分级、模型选型的定量依据",
      "key_points": [
        "KV Cache公式：2 × num_layers × num_kv_heads × head_dim × seq_len × batch_size × bytes_per_element",
        "GQA（Grouped Query Attention）：KV头数少于Q头数，KV Cache可缩减4-8倍",
        "显存总预算 = 模型权重 + KV Cache + 激活值 + 系统开销",
        "910B3(64GB) vs 910B4(32GB)：同一模型在不同卡上能支撑的最大并发差异可达2-3倍",
        "长上下文场景KV Cache爆炸式增长：seq_len从4K到32K，KV Cache增长8倍"
      ],
      "real_world_connection": "MiniMax 2.5部署时每张910B3能扛多少并发，就是用这个公式算出来的。910B4放不下某些模型也是这个公式说了算"
    },
    {
      "id": "T03",
      "stage_id": "S1",
      "name": "MoE vs Dense的推理差异",
      "sort_order": 3,
      "difficulty": 2,
      "study_time_minutes": 30,
      "prerequisites": ["T02"],
      "why": "MoE是当前模型架构的主流趋势，理解其推理特性直接影响模型选型和硬件匹配决策",
      "key_points": [
        "MoE核心机制：Router/Gate选择Top-K个Expert激活，其余Expert不参与计算",
        "关键区分：总参数决定显存占用，激活参数决定每token计算量",
        "Qwen3.5-35B-A3B：总参数35B（需要约70GB FP16显存），但每token只激活3B参数",
        "对硬件选型的影响：910B4(32GB)放不下35B总参数的MoE模型，即使激活参数只有3B",
        "MoE的额外开销：Expert路由计算、All-to-All通信（多卡部署时）、负载不均衡问题"
      ],
      "real_world_connection": "评估Qwen3.5-35B-A3B用于快速Agent循环时，核心判断就是：910B3能装但910B4装不下，速度接近小模型但质量接近大模型"
    },
    {
      "id": "T19",
      "stage_id": "S1",
      "name": "注意力机制演进：从MHA到线性注意力",
      "sort_order": 4,
      "difficulty": 2,
      "study_time_minutes": 45,
      "prerequisites": ["T02"],
      "why": "2026年各家模型架构在注意力机制上彻底分化，平台方需要理解不同attention机制的模型落到集群上的资源特征差异",
      "key_points": [
        "标准Attention瓶颈：O(n²)计算复杂度 + O(n)KV Cache线性增长，1M上下文时KV Cache可达数百GB",
        "MHA → MQA → GQA → MLA演进线：减少KV头数/压缩KV维度来缩小Cache",
        "线性注意力本质：用O(n)复杂度替代O(n²)，把KV压缩成固定大小的状态矩阵，新token只更新状态不回看历史",
        "线性注意力的代价：表达能力弱于softmax attention，精确检索和远距离依赖捕捉能力差",
        "2026年趋势：混合架构——大部分层用线性attention省资源，少数层用full attention保精度",
        "三条技术路线并存：Qwen用Gated DeltaNet混合、DeepSeek V4用CSA/HCA压缩稀疏、MiniMax M2.5用纯MHA"
      ],
      "real_world_connection": "不同attention机制的模型落到集群上KV Cache占用完全不同，同样显存预算下GQA模型与Gated DeltaNet模型的并发能力可能差3-5倍"
    },
    {
      "id": "T20",
      "stage_id": "S1",
      "name": "Gated DeltaNet混合架构：Qwen3.5/3.6的做法",
      "sort_order": 5,
      "difficulty": 3,
      "study_time_minutes": 40,
      "prerequisites": ["T19"],
      "why": "Qwen是GTS绿区核心候选模型家族，理解其推理特性才能做正确的部署决策",
      "key_points": [
        "DeltaNet原理：维护固定大小的记忆矩阵，每个新token通过delta规则更新矩阵，不存储完整KV Cache",
        "Gated DeltaNet：加入Mamba风格门控机制，学习何时更新/保留记忆，类似LSTM的遗忘/记忆能力",
        "3:1混合比例：Qwen3.6-27B的64层 = 16个块 × (3层Gated DeltaNet + 1层Gated Attention)",
        "头数配置：DeltaNet层48个V头/16个QK头，Gated Attention层24个Q头/仅4个KV头，极限压缩KV Cache",
        "DeltaNet层不产生传统KV Cache（固定状态矩阵），只有25%的full attention层产生KV Cache",
        "Qwen3.6同时支持MTP头做speculative decoding，与GTS当前MTP方向兼容"
      ],
      "real_world_connection": "Qwen3.6-27B(dense)在910B3上FP8约27GB可单卡部署，混合attention使KV Cache远小于MiniMax 2.5，同显存下并发能力更强"
    },
    {
      "id": "T21",
      "stage_id": "S1",
      "name": "DeepSeek V4的CSA/HCA混合注意力",
      "sort_order": 6,
      "difficulty": 3,
      "study_time_minutes": 45,
      "prerequisites": ["T19"],
      "why": "DeepSeek V4代表另一条技术路线——压缩+稀疏，1M上下文KV Cache仅为V3.2的10%，代表行业方向",
      "key_points": [
        "CSA两步压缩：先4x KV压缩（softmax-gated pooling），再用Lightning Indexer做top-k稀疏选择 + 128 token sliding window",
        "HCA超激进压缩：128x压缩率，对压缩后极短序列做dense attention，提供廉价全局视野",
        "CSA/HCA交替排列：CSA提供精确稀疏检索，HCA提供模糊全局概览，各层职责不同",
        "与V3 MLA的对比：V3用latent压缩KV，V4用压缩+稀疏+超压缩，压缩率更高但依赖learned compressor质量",
        "FP4深入骨髓：Lightning Indexer用FP4，MoE权重FP4 QAT，训练时就用低精度",
        "对推理框架的挑战：CSA/HCA非标准attention，vLLM/SGLang需专门适配，昇腾适配会滞后"
      ],
      "real_world_connection": "V4-Pro(1.6T)/Flash(284B)暂时不会在910B3上跑，但CSA/HCA设计思想代表行业方向，未来开源模型会跟进，需提前评估vLLM Ascend适配难度"
    },
    {
      "id": "T04",
      "stage_id": "S2",
      "name": "Ascend 910B系列硬件规格与分级策略",
      "sort_order": 1,
      "difficulty": 2,
      "study_time_minutes": 35,
      "prerequisites": ["T02"],
      "why": "硬件是所有优化的天花板，理解910B3/B4差异才能做正确的模型-硬件匹配决策",
      "key_points": [
        "910B3：64GB HBM，算力约XXX TFLOPS(FP16)，HBM带宽约XXX TB/s",
        "910B4：32GB HBM，成本更低但显存限制更严",
        "达芬奇架构：AI Core = Cube Unit(矩阵) + Vector Unit(向量) + Scalar Unit(标量)",
        "与NVIDIA对比：A100/H100的SM/Tensor Core vs 达芬奇的Cube/Vector，计算范式不同",
        "硬件分级策略：B3用于大模型，B4用于中小模型",
        "A2是上上代硬件，战略上避免在裸推理性能上与NVIDIA竞争"
      ],
      "real_world_connection": "640卡集群全是910B3(64GB)，64卡最小集群单元基于部署密度、调度效率、运维复杂度的综合考量"
    },
    {
      "id": "T05",
      "stage_id": "S2",
      "name": "昇腾NPU架构与自研算子的价值",
      "sort_order": 2,
      "difficulty": 3,
      "study_time_minutes": 40,
      "prerequisites": ["T04"],
      "why": "理解GTS自研算子的性能提升来源和优化边界",
      "key_points": [
        "CANN软件栈分层：应用 → GE → TBE → Runtime → 硬件",
        "Ascend C编程模型：直接控制数据搬运(GM→UB)和计算流水线",
        "核心优化：Tiling策略、Double Buffer、Kernel Fusion",
        "GTS自研算子替换vLLM默认实现，针对910B硬件特性做深度适配",
        "管理者视角：理解算子优化ROI——哪些算子是性能热点(Attention/FFN)，优化空间有多大"
      ],
      "real_world_connection": "GTS高性能算子是相对于其他使用同款硬件团队的差异化竞争力"
    },
    {
      "id": "T06",
      "stage_id": "S2",
      "name": "vLLM核心机制",
      "sort_order": 3,
      "difficulty": 3,
      "study_time_minutes": 50,
      "prerequisites": ["T02", "T01"],
      "why": "vLLM是推理引擎基座，理解核心机制才能判断优化方向和瓶颈所在",
      "key_points": [
        "PagedAttention：借鉴OS虚拟内存，KV Cache按Block分配，Block Table做逻辑→物理映射",
        "Continuous Batching：已完成请求立即释放，新请求随时插入，NPU利用率显著提升",
        "Prefix Caching：共享system prompt的KV Cache只算一次并复用，Radix Tree前缀匹配",
        "Chunked Prefill：长prompt切分多chunk与Decode交错执行，避免阻塞decode延迟",
        "调度器(Scheduler)：管理请求队列、KV Cache分配、抢占策略，是vLLM的大脑"
      ],
      "real_world_connection": "1300并发用户的MaaS服务底层靠vLLM的PagedAttention管KV Cache + Continuous Batching提NPU利用率"
    },
    {
      "id": "T07",
      "stage_id": "S2",
      "name": "vLLM昇腾适配与GTS定制",
      "sort_order": 4,
      "difficulty": 3,
      "study_time_minutes": 35,
      "prerequisites": ["T06", "T05"],
      "why": "理解vLLM在昇腾上的差异，以及团队定制化工作解决的问题",
      "key_points": [
        "vLLM Ascend后端：CUDA kernel替换为CANN算子，适配达芬奇架构",
        "GTS高性能算子替换：在Attention/FFN热点路径替换默认实现",
        "性能差异：昇腾 vs NVIDIA的推理性能差距客观存在，通过算子优化可缩小",
        "自研调度器/网关：在vLLM之上的服务化层，解决多集群、多租户、流量治理",
        "自研 vs 开源边界：vLLM核心跟社区，GTS算子和调度网关层自研，两者解耦"
      ],
      "real_world_connection": "全栈 = vLLM(社区) + GTS算子(自研) + 调度器/网关(自研) + ClickHouse可观测性(自研)"
    },
    {
      "id": "T08",
      "stage_id": "S2",
      "name": "Prefill/Decode分离与4P4D架构",
      "sort_order": 5,
      "difficulty": 3,
      "study_time_minutes": 40,
      "prerequisites": ["T06", "T01"],
      "why": "P/D分离是推理架构重要演进方向，团队已在用4P+4D架构",
      "key_points": [
        "分离动机：Prefill(compute-bound)和Decode(memory-bound)混合会互相干扰",
        "4P+4D架构：8卡节点中4张做Prefill、4张做Decode，各自独立调度",
        "KV Cache传输：Prefill卡算完KV传给Decode卡，节点内HCCS高速互联",
        "容量影响：分离后Prefill算力利用率和Decode并发能力均提升",
        "MTP上线后Decode速度大幅提升，Prefill可能成为新瓶颈——需重新平衡P/D比例"
      ],
      "real_world_connection": "当前P90 TPOT约42ms，MTP上线后理论可降到13-17ms，但Prefill必须跟得上"
    },
    {
      "id": "T09",
      "stage_id": "S3",
      "name": "MTP投机推理",
      "sort_order": 1,
      "difficulty": 3,
      "study_time_minutes": 50,
      "prerequisites": ["T01", "T08"],
      "why": "当前最重要的性能优化方向，直接决定集群容量能否从1200翻倍到3000+",
      "key_points": [
        "Speculative Decoding原理：小模型draft多token → 大模型一次前向并行验证 → 拒绝采样保证无损",
        "两种形态：独立Draft Model vs 模型原生MTP Head",
        "接受率α决定收益：α=0.83意味着平均每次验证接受约5个token中的4个",
        "域内MTP头基于约1个月内部QA数据训练，域内数据 > 通用数据的接受率",
        "Batch Size影响：小batch收益最大（交互coding），大batch边际递减",
        "性能验证：固定并发对比MTP开/关的P50/P90 TPOT和吞吐QPS"
      ],
      "real_world_connection": "P90 TPOT从42ms降到13-17ms，集群容量从~1200到~3000-3600，这是MTP撬动的最大业务价值"
    },
    {
      "id": "T10",
      "stage_id": "S3",
      "name": "量化技术与硬件分级选型",
      "sort_order": 2,
      "difficulty": 2,
      "study_time_minutes": 35,
      "prerequisites": ["T02", "T04"],
      "why": "量化是有限显存下部署更大模型或支撑更多并发的关键手段",
      "key_points": [
        "量化本质：更少bit表示权重，减少显存和HBM搬运量，代价是精度损失",
        "常见方案：W8A8、W4A16、GPTQ/AWQ训后量化",
        "Decode阶段权重减半 → HBM搬运减半 → 速度接近翻倍",
        "质量影响：W8A8通常损失小，W4A16在复杂推理可能明显退化",
        "硬件分级：910B3(64G)用FP16，910B4(32G)用W8A8或W4A16",
        "量化不是免费午餐，关键业务慎用激进量化"
      ],
      "real_world_connection": "MiniMax 2.5在910B3上的精度选择直接影响可行性和质量"
    },
    {
      "id": "T11",
      "stage_id": "S3",
      "name": "推理服务指标体系",
      "sort_order": 3,
      "difficulty": 2,
      "study_time_minutes": 30,
      "prerequisites": ["T01"],
      "why": "不会看指标就不会做决策，这些指标是评估系统健康度和优化效果的定量语言",
      "key_points": [
        "TTFT：首token延迟，由Prefill速度决定",
        "TPOT：每token生成间隔，由Decode速度决定",
        "TPS：每秒产出token数，衡量单请求速度",
        "Throughput：系统级吞吐量，衡量集群整体产能",
        "P50/P95/P99百分位延迟比平均值更有意义",
        "核心矛盾：提高batch size可提升Throughput但增加单请求TPOT"
      ],
      "real_world_connection": "P90 TPOT约42ms是关键基线，MTP效果验证就看这个数字能降多少"
    },
    {
      "id": "T12",
      "stage_id": "S3",
      "name": "网关架构与跨集群智能路由",
      "sort_order": 4,
      "difficulty": 3,
      "study_time_minutes": 45,
      "prerequisites": ["T11"],
      "why": "10集群 + 统一网关 + 网络隔离，路由只有一次机会，这是服务架构核心约束",
      "key_points": [
        "统一网关职责：请求入口、协议转换(OpenAI兼容)、认证鉴权、路由、SSE流式输出",
        "One-shot routing约束：集群间隔离，选错无fallback",
        "集群水位上报：每2-3秒推送active_requests/queued/kv_cache_pct/avg_latency",
        "选路演进：①加权最少连接+水位 → ②请求分级差异化 → ③ClickHouse预测式路由",
        "硬阈值保护：排队超限或KV Cache>85%直接移除候选",
        "评分公式：score = 剩余KV×0.4 + 排队空间×0.3 + 延迟达标度×0.3"
      ],
      "real_world_connection": "Phase 1限流已完成，下一步把轮询改成水位感知智能选路是Phase 2核心工作"
    },
    {
      "id": "T13",
      "stage_id": "S3",
      "name": "流量治理：限流、分级与降级",
      "sort_order": 5,
      "difficulty": 3,
      "study_time_minutes": 40,
      "prerequisites": ["T12"],
      "why": "多租户平台流量治理决定服务质量下限，一人打爆全集群会摧毁信任",
      "key_points": [
        "令牌桶+滑动窗口混合限流，Redis做分布式状态",
        "请求分级三车道：轻量(<1K) / 中等(1K-8K) / 重载(>8K tokens)",
        "优先级降级链：压离线 → 限低优先级并发 → 降参数 → 排队 → 最后拒绝",
        "租户配额网关层本地缓存校验（毫秒级），不依赖中心计费系统",
        "加权公平队列(WFQ)防大用户饿死小用户"
      ],
      "real_world_connection": "Phase 1基础限流已有，Phase 2加分级路由，Phase 3加降级引擎和预测策略"
    },
    {
      "id": "T14",
      "stage_id": "S3",
      "name": "可观测性体系",
      "sort_order": 6,
      "difficulty": 2,
      "study_time_minutes": 35,
      "prerequisites": ["T11"],
      "why": "不能观测就不能优化，ClickHouse管道已搭好数据层，需理解完整设计思路",
      "key_points": [
        "AI推理可观测性 vs 传统微服务：请求持续秒到分钟级、资源消耗差异10倍以上、需token粒度计量",
        "双通道：实时流(ClickHouse物化视图→看板) + 批处理(聚合→计费报表)",
        "三级视图：集群鸟瞰 → TOP用户/token消耗 → 单请求排查",
        "告警：P99超阈值5分钟、单集群KV>85%、心跳超时",
        "数据保留：请求级原始日志约1月，聚合指标长期保留"
      ],
      "real_world_connection": "数据采集和ClickHouse处理层已就绪，当前重点是应用层看板"
    },
    {
      "id": "T15",
      "stage_id": "S4",
      "name": "多租户资源治理",
      "sort_order": 1,
      "difficulty": 3,
      "study_time_minutes": 40,
      "prerequisites": ["T13"],
      "why": "服务1000+用户跨多PDU，资源治理模型决定平台公平性和可持续运营",
      "key_points": [
        "份额制：各PDU按贡献硬件获得份额，份额∝贡献，带权系数调节",
        "保底配额+弹性池：guaranteed quota保底，空闲资源进弹性池竞争",
        "虚拟积分差异化定价：T1模型消耗更多积分，引导合理选择",
        "计费对账：ClickHouse记录 vs 计费系统每日diff",
        "多PDU服务范围：不同PDU在蓝/绿/黄区的访问策略不同"
      ],
      "real_world_connection": "份额制框架解决'谁出硬件谁有保底算力，空闲时共享'的公平问题"
    },
    {
      "id": "T16",
      "stage_id": "S4",
      "name": "模型生命周期管理",
      "sort_order": 2,
      "difficulty": 2,
      "study_time_minutes": 30,
      "prerequisites": ["T06"],
      "why": "多模型(T1/T2/T3)需要标准化上下线、灰度、版本管理流程",
      "key_points": [
        "YAML声明式模型注册表：新模型只改配置不改代码",
        "模型分级：T1(MiniMax 2.5) → T2(Qwen中等) → T3(Qwen轻量)",
        "灰度发布：1集群灰度 → 观察指标 → 扩全集群",
        "上线前三重评估：质量benchmark + 安全对齐 + 性能TPOT/吞吐",
        "蒸馏模型安全风险：社区蒸馏模型可能对齐缺失"
      ],
      "real_world_connection": "评估新模型如Qwen3.6-27B时走的就是评估→灰度→上线流程"
    },
    {
      "id": "T17",
      "stage_id": "S4",
      "name": "MaaS平台架构全景",
      "sort_order": 3,
      "difficulty": 3,
      "study_time_minutes": 45,
      "prerequisites": ["T04", "T06", "T12", "T14", "T15"],
      "why": "拉通所有模块为一张完整架构图，理解每层职责边界和层间接口",
      "key_points": [
        "七层架构：硬件 → 算子 → 推理引擎 → 网关 → 可观测性 → 治理 → 业务应用",
        "关键接口：引擎暴露OpenAI兼容API，网关做协议统一，可观测性旁路不侵入主链路",
        "数据流：用户请求 → 网关(鉴权+路由) → 集群(推理) → 流式响应 → 旁路日志 → ClickHouse",
        "控制流：运维 → 模型注册表(YAML) → 集群配置同步 → 灰度发布",
        "物理拓扑(10×64卡) → 逻辑拓扑(4P+4D) → 统一网关(one-shot路由)"
      ],
      "real_world_connection": "这是40人团队的作战地图，新人第一天应先看懂这张图"
    },
    {
      "id": "T18",
      "stage_id": "S4",
      "name": "竞争力定位与硬件代际策略",
      "sort_order": 4,
      "difficulty": 2,
      "study_time_minutes": 35,
      "prerequisites": ["T17"],
      "why": "技术人员需要理解自己工作的战略价值",
      "key_points": [
        "核心威胁：绿/黄区逐步放开外部API，内部竞对可部署同款开源模型",
        "不可替代价值：统一AI基础设施层——网关、调度、治理、可观测性、安全合规",
        "练兵场价值：千卡集群管理经验是稀缺能力",
        "域内数据护城河：MTP头α=0.83的接受率来自域内数据",
        "叙事升级：从'自建推理系统'到'企业AI基础设施统一管理平台'",
        "硬件代际：A2→A3→A5，聚焦平台和业务集成深度"
      ],
      "real_world_connection": "当高层问'外部API能用了为什么还需要你们'时，答案不是'推理更快'而是'全栈安全落地'"
    }
  ],
  "learning_paths": {
    "main_track": {
      "name": "主干线路（推荐）",
      "description": "从第一性原理到MaaS全景的核心路径",
      "sequence": ["T01", "T02", "T03", "T19", "T04", "T06", "T08", "T09", "T11", "T12", "T17"]
    },
    "attention_track": {
      "name": "注意力机制专题",
      "description": "深入理解2026年注意力机制分化，可与主干并行",
      "sequence": ["T19", "T20", "T21"]
    },
    "hardware_track": {
      "name": "硬件支线",
      "description": "昇腾硬件和算子体系",
      "sequence": ["T04", "T05", "T07"]
    },
    "ops_track": {
      "name": "运维治理支线",
      "description": "服务化、流量治理和可观测性",
      "sequence": ["T12", "T13", "T14", "T15"]
    }
  },
  "metadata": {
    "total_topics": 21,
    "total_study_time_minutes": 830,
    "total_study_time_hours": "约13.8小时",
    "target_audience": "GTS AI Infra团队新人（有基础CS背景）",
    "platform_context": "GTS MaaS平台，基于昇腾A2 910B3/B4，640卡，10集群"
  }
}
```

> **注意**：T04 中的 910B3 算力和带宽数字用 `XXX` 占位，需填入实际硬件规格值。

---

## 6. UI/UX 设计要求

### 6.1 整体风格

- 深色主题为主（程序员友好），提供亮色切换
- 简洁技术风，参考 Obsidian / Notion 的阅读体验
- 中文界面，所有文本内容均为中文

### 6.2 知识学习页

```
┌─────────────────────────────────────────────────────────┐
│  [路线图视图]  [列表视图]                    进度: 5/21  │
├──────────┬──────────────────────────────────────────────┤
│ S1 第一性 │  T01 Compute vs Memory Bound          ★★☆  │
│  ├ T01 ✅ │  ⏱ 45分钟  |  前置: 无                      │
│  ├ T02 🔄 │───────────────────────────────────────────── │
│  ├ T03    │  为什么重要                                   │
│  ├ T19    │  所有推理优化决策的根基...                     │
│  ├ T20    │───────────────────────────────────────────── │
│  └ T21    │  关键知识点                                   │
│ S2 昇腾   │  • Arithmetic Intensity = FLOPs / Bytes...   │
│  ├ T04    │  • Prefill阶段：compute-bound...             │
│  ├ T05    │  • Decode阶段：memory-bound...               │
│  ...      │───────────────────────────────────────────── │
│           │  实战关联                                     │
│           │  MTP能把并发从1200提升到3000+...              │
│           │───────────────────────────────────────────── │
│           │  [标记为已完成]  [开始考试]                    │
└──────────┴──────────────────────────────────────────────┘
```

### 6.3 路线图视图

- 用 DAG 有向图展示 21 个专题的依赖关系
- 节点颜色表示状态：灰色=未学习，蓝色=学习中，绿色=已完成
- 节点大小或边框表示难度等级
- 点击节点跳转到对应专题详情
- 高亮推荐的主干学习路径

### 6.4 考试页

- 选择考试范围（专题/阶段/综合）
- 逐题作答，支持上一题/下一题导航
- 提交后即时显示得分和错题解析
- 错题本：按专题归类，支持一键重练

### 6.5 移动端适配

- Android 端采用底部 Tab 导航：学习 | 路线图 | 考试 | 我的
- 知识点详情页为全屏滚动卡片
- 考试页为全屏沉浸模式
- 离线可用（本地 SQLite 存储）

---

## 7. 技术架构

### 7.1 PC 端（Electron 方案）

```
┌─────────────────────────────────────┐
│           Electron Shell            │
│  ┌───────────────────────────────┐  │
│  │    React / Vue 前端           │  │
│  │    + D3.js (路线图DAG可视化)   │  │
│  └───────────┬───────────────────┘  │
│              │ IPC                   │
│  ┌───────────▼───────────────────┐  │
│  │    Node.js 后端逻辑            │  │
│  │    better-sqlite3 驱动        │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │    SQLite 数据库文件            │  │
│  │    ~/.ai-infra-learn/data.db  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 7.2 Android 端（Flutter 方案）

```
┌─────────────────────────────────────┐
│           Flutter App               │
│  ┌───────────────────────────────┐  │
│  │    Dart UI Layer              │  │
│  │    + flutter_graph (DAG)      │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │    sqflite / drift            │  │
│  │    (SQLite ORM for Flutter)   │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │    SQLite 数据库文件            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 7.3 备选方案：跨平台统一（React Native + Electron 共享核心）

如果希望 PC 和 Android 共用一套代码：
- 使用 React Native（Android）+ Electron（PC），共享 React 组件和业务逻辑
- 数据库层各端独立使用 SQLite
- 初始化数据通过共享的 `seed_data.json` 保持一致

---

## 8. 开发优先级与里程碑

### Phase 1 — MVP（1-2 周）

- [ ] SQLite 数据库初始化 + seed_data.json 导入
- [ ] 知识点列表视图（按 Stage 分组展示）
- [ ] 知识点详情页（展示全部字段）
- [ ] 学习状态标记（未学习/学习中/已完成）
- [ ] PC 端可运行（本地 Web 或 Electron）

### Phase 2 — 核心体验（第 3-4 周）

- [ ] 路线图 DAG 可视化（依赖关系图）
- [ ] 考试模块：题库管理 + 做题 + 评分
- [ ] 错题本
- [ ] 知识点管理（增删改）
- [ ] JSON 导入导出

### Phase 3 — 移动端 + 增强（第 5-6 周）

- [ ] Android App 开发
- [ ] 进度统计仪表盘
- [ ] 题目批量导入
- [ ] 深色/亮色主题切换

### Phase 4 — 可选增强

- [ ] 多端数据同步（局域网 API Server）
- [ ] AI 出题（调用 LLM API 根据知识点自动生成题目）
- [ ] Markdown 格式的知识点内容扩展（支持富文本、代码块、公式）
- [ ] 学习时间追踪与统计

---

## 9. 验收标准

1. 首次启动自动初始化 21 个专题（4 阶段），数据完整无遗漏
2. 知识点列表/详情页信息展示完整，中文无乱码
3. 路线图 DAG 正确展示所有依赖关系，可点击跳转
4. 考试模块支持至少 3 种题型，自动判分准确
5. 学习状态持久化，重启 App 后状态不丢失
6. PC 端和 Android 端使用相同的 seed_data.json 初始化，数据一致
7. 支持新增/编辑知识点后数据正确持久化
