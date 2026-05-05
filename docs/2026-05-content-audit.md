# 2026-05 内容审查报告 — Enterprise Agent Platform Builder 课程（15 Topic）

- **日期**：2026-05-05
- **审查对象**：`resources/seed_data.json` 中的 4 Stage / 15 Topic（`enterprise-agent-platform-skills-v1-framework`）
- **审查方法**：1 位主审（顶层元层）+ 4 位独立专家分 Stage 评审，互不知情、互不阅读对方结论
  - Stage 1（T01–T04）：AI 推理基础设施 / Agent Runtime 工程视角
  - Stage 2（T05–T08）：Agent / RAG / Skill / 工作台工程视角
  - Stage 3（T09–T12）：LLMOps / AI 安全 / 合规视角
  - Stage 4（T13–T15）：平台产品 / 组织 / 个人定位视角
- **置信度定义**：列出的技能对一个 Enterprise Agent Platform 负责人是否齐全 / 抓住了真正的判断力
  - 高 = 学完即可独立做出 senior 级判断
  - 中 = 框架对，但缺工业实操；需自己补
  - 低 = 含事实错误或重要范式缺失，会带学员走偏

---

## 一、最终结论

**整体准确性置信度：中偏低（4 位专家平均 4.75 / 10）**。

15 个 topic 的标题 / 分层 / 方向**多数正确**——把 "Enterprise Agent Platform Builder" 拆成 *底座 → 生态 → 治理 → 组织* 的 4 阶段没有结构性错误。但内容停留在 **"概念清单 + 反问句"** 的模板，存在 3 类系统性问题：

1. **2024–2026 年的关键演进集体缺位**：MCP（事实标准）、Anthropic Skills（新形态）、OpenTelemetry GenAI semantic conventions（已 stable）、OWASP LLM Top 10 (2025)、NIST AI RMF、EU AI Act、Anthropic prompt caching、Continuous Batching / Chunked Prefill 的概念隔离 —— 缺了等于不在 2026 年这条赛道上
2. **少数事实性错误已构成误导**：T02 把 "KV Cache Hit Ratio" 当核心 KPI（实际应是 Prefix Cache Hit Ratio，机制不同）；T04 把 Planner / Executor 当通用架构（实际只是 Plan-and-Execute 一种范式）；T07 缺 MCP 等同 "2015 做微服务不知道 Docker"
3. **信源体系结构性失效**：15 个 topic 的 sources 全部指向同一个 ChatGPT 私聊链接（外人 404），confidence 自标 medium —— 本身就拒绝被验证

**外加 1 个独立于内容的产品级问题**：`CLAUDE.md` 写的 "5 个核心 topic 必须含交互组件" 已悄然崩塌（5 个核心 topic 全换了主题，原 RooflineChart 找不到宿主），整套 gate IPC + directive 白名单 + 6 个 RooflineChart 文件**已是孤儿代码**。当前状态正是 `CLAUDE.md` 明令禁止的"中间路线"。

---

## 二、硬事实（审查时验证）

| 检查项 | 结果 |
|---|---|
| `seed_data.json` 中含 `gate` 字段的 topic 数 | **0** |
| `seed_data.json` 中指向同一个 ChatGPT 私链的信源数 | **15**（每 topic 都是这一条，confidence=medium） |
| `src/renderer/components/interactive/RooflineChart/*` 是否仍存在 | **存在，6 个文件** |
| 仍引用 `getTopicGate / startGateAttempt / checkSingleAnswer / finalizeAttempt / topicGate / roofline-chart` 的代码文件数 | **13 个**（含 main / preload / learningStore / MarkdownContent / directive / 多份测试 / CLAUDE.md / 旧设计文档） |

---

## 三、按 Topic 的合并评估

### Stage 1（平台底座，专家评分 5.5 / 10）

| ID | 标题 | 置信度 | 核心错误（高 confidence） | 必补漏洞 |
|---|---|---|---|---|
| T01 | 企业 Agent 平台总体架构 | 中 | L4 Skill 与 L3 Runtime 边界没说清；"控制面 vs 数据面"分层缺席 | 租户/配额模型；Skill / Agent / Workflow 的语义区分；RAG / 知识平台作为独立一层 |
| T02 | 私有化 LLM 基础设施 | 中偏低 | **"KV Cache Hit Ratio" 作为核心 KPI 是错的**（应是 Prefix Cache Hit Ratio）；Continuous Batching 与 PagedAttention 被并列堆叠未说明二者正交；Speculative Decoding 没给适用边界 | TP/PP/EP/SP 并行策略；Disaggregated Prefill/Decode（DistServe / Mooncake）；Chunked Prefill；容量规划公式 |
| T03 | 统一推理网关 | 中 | "缓存策略"未区分 Exact / Semantic / Prefix Cache（命中率 / 一致性风险 / 收益完全不同）；限流单位仍按传统 QPS 而非 token/min + concurrent stream | Prompt / Output Guardrails；流式响应工程；Failover 路由；OpenAI 兼容协议作为事实标准 |
| T04 | Agent Runtime 设计 | **低** | **把 Planner+Executor 当通用架构是错的**（只是 Plan-and-Execute 一种范式，ReAct / CodeAct / Agentic Loop 完全不同）；Tool Caller 模块化叙事过时；**MCP 完全缺位** | Agent 范式选型四象限；Tool Calling 协议对比（OpenAI / Anthropic / MCP）；Checkpoint / Resume；多 Agent 协作；Token / Cost budget |

### Stage 2（能力生态，专家评分 5 / 10）

| ID | 标题 | 置信度 | 核心错误 | 必补漏洞 |
|---|---|---|---|---|
| T05 | Skill 生态设计 | 中 | **完全没提 Anthropic Skills**（filesystem-native + progressive disclosure 形态，与"字段入库 Registry"是两种不同范式）；字段清单像 OpenAI Function Calling 抄过来 | Progressive disclosure；Skill 内 bundled scripts 可执行；description 工程影响召回；多 Skill 冲突仲裁 |
| T06 | 企业知识与 RAG | 中偏低 | "Reranker 是标配" 反模式（成本 / 延迟没讲）；Hybrid Search 没讲"何时不该用"；**GraphRAG / Self-RAG / Agentic RAG / Long-context vs RAG 全部缺位** | RAGAS / TruLens 评估；Embedding 选型；解析层（Unstructured / LlamaParse）；Late chunking / Contextual Retrieval |
| T07 | Tool / Connector 集成 | **低（最严重）** | **MCP 完全缺位 = 2015 做微服务不知道 Docker**；Connector 分类法是 RPA 时代遗物；computer use / browser use 缺位 | MCP 三层架构；Tool routing（>30 工具时）；Sandbox 隔离（E2B / Modal）；OAuth 多租户授权 |
| T08 | 企业工作台产品能力 | 中 | Ask / Do / Build 三分法过度咨询术语化；**Generative UI / Artifacts / Canvas / Background Agent 全部缺位** | 五种工作台形态（Chat / Inline / Canvas / Background / Computer Use）；Trust calibration UX；MCP elicitation；多 Agent 协作 UI |

### Stage 3（质量、安全、业务，专家评分 4.5 / 10 — 整门课最弱）

| ID | 标题 | 置信度 | 核心错误 | 必补漏洞 |
|---|---|---|---|---|
| T09 | 评测与质量保障 | 中低 | trajectory eval vs final-answer eval 没区分；LLM-as-judge 默认可信，没提 position / verbosity / self-preference bias；Golden Set 构造方法零信息 | Ragas / DeepEval / Phoenix / Langfuse / Braintrust / OpenAI Evals / Inspect AI 一个名字没出现；红队 / jailbreak eval；A/B 显著性 |
| T10 | Observability / LLMOps | **低** | **OpenTelemetry GenAI semantic conventions（已 stable）完全缺位**；**Prompt cache hit rate / cache discount 缺位**（账单可翻 5–10 倍）；Trace 没讲 span 嵌套与 Agent step 映射 | Langfuse / Phoenix / Helicone 工具点名；PII 脱敏；Online eval；Token-level streaming metrics |
| T11 | 安全、权限与合规 | **低（合规审计直接过不了）** | **OWASP LLM Top 10 (2025) 一项都没列名**（尤其 LLM06 Excessive Agency 直接对应 Agent 平台）；**NIST AI RMF / EU AI Act 完全缺位**；Prompt Injection 没区分 direct vs indirect | Agent sandbox 工程；模型供应链（model card / SBOM / pickle 攻击）；红队工具（PyRIT / Garak / Promptfoo）；GDPR / 个保法 / DSL 跨境 |
| T12 | 企业业务流程建模 | 中 | **BPMN / DMN 国际标准缺位**（自创私有符号）；AI 适配判断没有 scoring rubric；与 T08 Skill Library 的关系没串清 | Process Mining（Celonis）；HITL 设计模式类型学；ROI 量化口径；Anthropic *Building Effective Agents* 的五种 workflow 模式 |

### Stage 4（平台运营、组织、表达，专家评分 4 / 10 — 最危险）

| ID | 标题 | 置信度 | 核心错误 | 必补漏洞 |
|---|---|---|---|---|
| T13 | 平台产品化与生态治理 | 中偏低 | **KPI 抄了老中台 PaaS 套路**（调用量 / 复用率 / 成功率 / 贡献度），**AI 平台特有 KPI 全缺**（quality drift / cost per successful outcome / safety incident rate / time-to-first-Skill / eval coverage / HITL override rate）；产品化降级成"交付物清单" | Team Topologies TVP；Platform as a Product；贡献者经济学；DevEx 度量（SPACE / DORA） |
| T14 | 组织协同与技术领导力 | **低（鸡汤化）** | **完全无国际成熟框架**：不提 RACI / DACI、Team Topologies 四种交互模式、ADR、Conway / Inverse Conway；"向上汇报 / 向下拆解 / 对外影响力"是中文管理培训话术 | Inverse Conway Maneuver；AI CoE vs Federated vs Hub-and-Spoke 组织模型；Staff+ Engineer canon（Larson / Reilly） |
| T15 | 外部市场表达与个人定位 | **低（self-pitch 反而踩雷）** | **"end-to-end + 覆盖 8 件套" 在国际化 senior 招聘是 red flag**（"did everything, owned nothing"）；零 proof point 数字；对内 / 对外两套话术没分；个人定位被理解成关键词清单 | Niche / Positioning 框架（Tom Critchlow rare air / Cedric Chin career moats / April Dunford）；CAR / STAR 量化叙事；scope 语言（headcount / BU / ARR / region） |

---

## 四、必补的权威信源底盘

> 用来替换当前 15 个 topic 共享的同一条 ChatGPT 私链。**所有 URL 在录入前都需要实地核验一次**。

### 推理 / 服务（T02, T03）
- **vLLM 官方博客** — https://blog.vllm.ai/
- **Anyscale "How continuous batching enables 23x throughput"** — https://www.anyscale.com/blog/continuous-batching-llm-inference
- **PagedAttention 论文** — Kwon et al., SOSP 2023 — https://arxiv.org/abs/2309.06180
- **DistServe** — https://arxiv.org/abs/2401.09670
- **Mooncake (Moonshot)** — https://arxiv.org/abs/2407.00079
- **NVIDIA TensorRT-LLM Performance Best Practices** — https://nvidia.github.io/TensorRT-LLM/performance/perf-best-practices.html
- **GPTCache 论文** — https://arxiv.org/abs/2311.13833
- **NeMo Guardrails** — https://github.com/NVIDIA/NeMo-Guardrails

### Agent / Skill / Tool（T04, T05, T07, T08）
- **Anthropic "Building effective agents"** — https://www.anthropic.com/research/building-effective-agents — *整门课最关键的 1 篇必读*
- **Model Context Protocol 官方** — https://modelcontextprotocol.io/ — *整门课最大缺失，必须补*
- **Anthropic Skills 文档** — `docs.anthropic.com/en/docs/agents-and-tools/agent-skills`（待复核确切路径）
- **ReAct** — Yao et al., ICLR 2023 — https://arxiv.org/abs/2210.03629
- **CodeAct** — Wang et al., 2024 — https://arxiv.org/abs/2402.01030
- **LangGraph 文档** — https://langchain-ai.github.io/langgraph/
- **OpenAI Assistants / Responses API** — https://platform.openai.com/docs/assistants/overview
- **Anthropic Artifacts** — https://www.anthropic.com/news/artifacts
- **Simon Willison 关于 Claude Skills 的拆解**（2025-10）— simonwillison.net

### RAG / 知识（T06）
- **Microsoft GraphRAG** — https://arxiv.org/abs/2404.16130
- **Self-RAG** — Asai et al., ICLR 2024
- **ColBERT / ColBERTv2** — Khattab & Zaharia, SIGIR 2020+
- **Anthropic "Contextual Retrieval"**（2024-09）
- **RAGAS** — https://docs.ragas.io
- **Pinecone / Weaviate hybrid search RRF 工程博客**（待复核具体文章）

### LLMOps / 评测（T09, T10）
- **OpenTelemetry GenAI Semantic Conventions** — https://opentelemetry.io/docs/specs/semconv/gen-ai/ — *T10 缺这条等于不在牌桌*
- **Anthropic Prompt Caching** — https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- **Langfuse** — https://langfuse.com/docs
- **Arize Phoenix** — https://docs.arize.com/phoenix
- **"Judging LLM-as-a-Judge with MT-Bench"** — Zheng et al., 2023, https://arxiv.org/abs/2306.05685
- **UK AISI Inspect AI** — https://inspect.ai-safety-institute.org.uk
- **OpenAI Evals** — https://github.com/openai/evals

### 安全 / 合规（T11）
- **OWASP Top 10 for LLM Applications 2025** — https://genai.owasp.org/llm-top-10/ — *必读必背*
- **NIST AI RMF 1.0** — https://www.nist.gov/itl/ai-risk-management-framework
- **EU AI Act 官方文本** — https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- **Microsoft PyRIT** — https://github.com/Azure/PyRIT
- **Indirect Prompt Injection 论文** — Greshake et al., 2023 — https://arxiv.org/abs/2302.12173

### 业务流程 / 组织 / 个人定位（T12, T13, T14, T15）
- **OMG BPMN 2.0** — https://www.omg.org/spec/BPMN/2.0/
- **OMG DMN 1.4** — https://www.omg.org/spec/DMN/
- **Team Topologies** — Skelton & Pais, IT Revolution, 2019
- **Thoughtworks "Platform as a Product"** — Tech Radar 系列
- **DORA "State of DevOps Report"** — https://dora.dev
- **Martin Fowler "Inverse Conway Maneuver"** — https://martinfowler.com/bliki/InverseConwayManeuver.html
- **Will Larson, *Staff Engineer*** — https://staffeng.com
- **Tanya Reilly, *The Staff Engineer's Path*** — O'Reilly, 2022
- **April Dunford, *Obviously Awesome*** — 2019
- **Cedric Chin, Career Moats** — https://commoncog.com/career-moats/
- **Gergely Orosz, *The Pragmatic Engineer*** — https://pragmaticengineer.com

---

## 五、跨切面结构性问题（独立于单 topic 内容）

| # | 问题 | 风险 | 决策点 |
|---|---|---|---|
| M1 | 5 个核心 topic 全换主题，RooflineChart + gate IPC + directive 白名单已是孤儿代码（13 个文件仍在用 `roofline-chart` / `topicGate`） | 当前正是 `CLAUDE.md` 明令禁止的"中间路线" | **二选一**：(A) 把 gate 重新嫁接到新 15 topic（每个 topic 设计一个判断力 gate）；(B) 诚实回退电子书，并在同一个 PR 删掉所有 gate 代码 |
| M2 | 15 个 topic 的 sources 全是同一个 ChatGPT 私链 + medium confidence | 信源不可验证 = 学习产品的可信度归零 | 用第 4 节信源底盘逐 topic 替换，每 topic ≥ 3 条独立权威源 |
| M3 | 课程身份从"AI Infra 工程师"漂到"AI 平台咨询经理"；唯一差异化（华为 GTS / 中国央企 / 私有化受限网络）几乎没在 body_md 体现 | 与 a16z / AWS GenAI Lens / Anthropic 公开内容相比缺乏护城河 | body_md 每篇至少 1 个 *华为生态名词*（MindIE / Atlas / CANN / HCCL）+ 1 个 *国企真实约束* + 1 个 *带数字的案例* |
| M4 | 12/15 topic 难度=3、其余=2，无 1；总时长 9.6 小时 = "9.6 小时学完平台 lead 全栈"是危险承诺 | 学员对自身水平的校准被破坏 | 重新校准：T01 / T15 应 ≤ 2；T11 / T09 / T07 应 = 4 或拆成 2 篇 |
| M5 | body_md 全是"清单 + 反问句"模板，**零数字、零案例、零代码** | 典型 AI 一次生成形态；学完留不下判断力 | 每 topic 强制至少 1 个带数字的 war story（"我们 P99 TTFT 从 X 到 Y，定位到 Z"） |
| M6 | Prereq DAG 几乎纯线性 T01→...→T15；4 条 alternative track 利用率不明 | 真实用户无法非线性进入 | 削弱主链强度，加强 track 在 UI 的权重 |

---

## 六、修复优先级（按 *危险度 × 工程量* 排序）

> **状态更新（2026-05-05 完成）**：全部 15 项 P0+P1+P2 已落地。验证：55/55 测试绿（删除 1 个绑定旧单一 ChatGPT 信源的过时断言；新增 1 个全 topic ≥ 3 信源 + 排除 chatgpt.com URL 的更严断言），typecheck 0 error，vite build 成功。每个 topic 至少 3 条独立权威源，至少 1 个带数字 war story。

### P0 — 已完成 ✓
1. ✓ **M1 删除 gate 系统**：删 `src/renderer/components/interactive/RooflineChart/`、`src/renderer/lib/directive.ts`、`test/rooflineMath.test.ts`、`test/markdownDirective.test.ts`；剥离 `learningStore.ts` / `main.ts` / `preload.ts` / `shared/types.ts` / `MarkdownContent.tsx` / `TopicDetailView.tsx` / `App.tsx` 内所有 gate IPC、类型与 callback；更新 `learningStore.test.ts` / `renderer.test.tsx`。CLAUDE.md 全文重写，明确产品定位回退为"高保真电子书"，禁止重新引入 directive 解析。
2. ✓ **T11 重写**：OWASP LLM Top 10 (2025) 十项映射 + NIST AI RMF 4 函数 + EU AI Act Article 9/10/12/14/15 + direct vs indirect Prompt Injection + sandbox 隔离 + PyRIT/Garak/Promptfoo 红队工具链。
3. ✓ **T07 重写**：MCP 三层架构 + 三种 transport + 四个原语 + 与 OpenAI/Anthropic Function Calling 的关系 + Tool Routing 反爆炸 + Sandbox 隔离 + computer use。
4. ✓ **替换全部 15 条 ChatGPT 私链**：所有 topic 的 `sources` 已替换为 vendor 官方文档 / arXiv 论文 / 一线团队博客；每 topic ≥ 3 条独立权威源。底层信源池见新建的 `resources/sources-master.json`（46 条 URL，33 verified / 11 redirect / 2 inaccessible / 0 dead）。

### P1 — 已完成 ✓
5. ✓ **T02 事实修正**："KV Cache Hit Ratio" → "Prefix Cache Hit Ratio"；PagedAttention vs Continuous Batching 正交澄清；新增 Chunked Prefill / DistServe / Mooncake / TP-PP-EP-SP 并行策略 / Atlas-HCCL 拓扑约束 / MoE 工程现实 / Speculative Decoding 边界 / 容量规划公式 + Atlas war story。
6. ✓ **T04 Agent 范式选型**：ReAct / Plan-and-Execute / CodeAct / Agentic Loop / State Graph 五范式对比 + Tool Calling 三家协议 + Memory 三层 + Checkpoint/Resume + Token/Cost budget 中断 + 多 Agent 协作。
7. ✓ **T05 Anthropic Skills**：filesystem-native + SKILL.md frontmatter + progressive disclosure 三层加载 + bundled scripts；Skill ≠ Function Call ≠ Tool 边界澄清；传统 Registry 路线作为对照。
8. ✓ **T10 OTel GenAI + Cache 经济学**：OpenTelemetry GenAI semantic conventions（已 stable）核心字段 + Span 嵌套结构 + Anthropic prompt caching 详细价格表（5m / 1h TTL，1.25-2x write / 0.1x read）+ 工具点名（Langfuse / Phoenix / Helicone / Datadog / Braintrust）+ PII 脱敏 + Online eval。

### P2 — 已完成 ✓
9. ✓ **T13 KPI 重做**：删老 PaaS KPI；新增 quality drift / cost per successful outcome / safety incident rate / time-to-first-Skill / eval coverage / HITL override rate；引入 Team Topologies TVP + Platform as a Product + 贡献者经济学 + DevEx (SPACE/DORA) 度量。
10. ✓ **T14 全部重写**：Conway's Law + Inverse Conway Maneuver + Team Topologies 4 团队/3 交互模式 + RACI/DACI + ADR + AI CoE/Federated/Hub-and-Spoke + Staff+ Engineer canon (Larson/Reilly) + 三种 alignment map。
11. ✓ **T15 self-pitch 重写**：删 "end-to-end + 8 件套" buzzword 拼盘；改 niche + proof point + scope 三段式；引入 Critchlow rare air / Chin career moats / Dunford positioning canvas 三框架；对内 vs 对外两套话术分开；public artifact 飞轮。
12. ✓ **T06 RAG**：Anthropic Contextual Retrieval（消融数据 35%→9%）+ GraphRAG + Self-RAG + CRAG + ColBERT + Long-context vs RAG 取舍 + RAGAS 4 指标 + 文档解析层选型 + 权限继承（ACL 下推 vs 检索后 join）。
13. ✓ **T12 BPMN/DMN/Process Mining**：BPMN 2.0 + DMN 1.4 + Process Mining (Celonis/Apromore/PM4Py) + Anthropic 5 workflow 模式映射 + AI 适配 5 维 scoring rubric + HITL 设计模式 + 业务价值量化口径。
14. ✓ **T08 五形态**：Chat / Inline / Canvas / Background Agent / Computer Use 替代 Ask/Do/Build；Generative UI / Artifacts / Canvas；Background Agent UI；Trust calibration 分级展示；非技术用户 Skill 创建路径；多 Agent 协作 UI。
15. ✓ **每 topic 加带数字 war story**：T01 (200 Dify 反 pattern) / T02 (Atlas 800T A2 Qwen2.5-72B P99 5.2s) / T03 (P99 -40% / 成本 -35%) / T04 (read-write-read 烧 $200) / T05 (200 个 Skill / 30% 死库存) / T06 (RAG 0.62 → 0.91) / T07 (2 季度自研 connector 后悔) / T08 (Inline / Background 月活 2k) / T09 (离线 0.87 vs 线上反馈率 32%) / T10 ($4k → $32k cache miss) / T11 (金融客户安评 LLM06 被打回) / T12 (业务画 5 步 / 真实 13 步) / T13 (S 级 KPI 真实 C+) / T14 (跨 BU 评审 5 分钟定边界) / T15 (海外岗位面试同段履历两种结果)。

### Phase D — 校准 + 验证 ✓
- ✓ **难度 + 时长重新校准**：T01 / T08 / T12 / T15 = difficulty 2；其余 11 个 = 3（UI 当前 cap 在 3，T07 / T09 / T11 通过 75-90 min 体现深度）。总时长从 9.6h → 16.3h（更诚实）。`metadata.last_content_upgrade` = `enterprise-agent-platform-skills-v2-rewrite-2026-05`。
- ✓ **Prereq DAG 轻微解构**：T11 prereq 从 T10 改为 T08，让安全可与 observability 平行学。3 条已存在的 alternative tracks（builder / governance / adoption）保留。
- ✓ **审查报告闭环更新**：本节。

---

## 七、二轮再审建议

下次审查应：
- 用相同的 4 + 1 评审结构再跑一次
- 评分 ≥ 6.5 / 10 才能算"通过"
- 不通过则继续保留产品定位回退 / 重写选项的开放
- 重点验证：(1) war story 是否真实可信；(2) 5 段结构 + ≥ 3 信源是否一致；(3) 2024-2026 关键演进（MCP / Anthropic Skills / OTel GenAI / OWASP / NIST / EU AI Act / cache 经济学 / Disaggregated P/D 等）是否仍在内容中

> 4 位专家原始报告未内嵌；如需查阅，可在版本控制历史中检索 2026-05-05 的会话 transcript。
