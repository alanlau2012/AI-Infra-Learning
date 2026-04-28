# MiniMax 家族可验证事实清单（Source Snapshot）

> 本文是为 Topic T02 / T10 / T19 共用的 MiniMax 模型名离线证据档案。
>
> 用途：所有改写 T02 / T10 / T19 正文、key_points、sources、known-models 时引用的 MiniMax 具体型号，必须能在本文找到一手 URL；找不到官方渠道的版本号只能改成定性表述，或用 `[!ASSUMPTION]` callout 标注。
>
> 抓取日期：2026-04-28（Asia/Shanghai）。如 MiniMax 官方后续更新 Hugging Face、GitHub、官网或 API 文档，需要更新本文和 `last_verified` 字段。

---

## 1. 已确认存在的 MiniMax 官方模型 / 版本清单

### 1.1 Hugging Face 官方组织与命名规则

MiniMax 官方 Hugging Face 组织为 `MiniMaxAI`，组织卡片列出官方模型集合，并声明这是 MiniMax 的 official Hugging Face organization。当前文本/LLM 相关公开模型主要分为 MiniMax-01、MiniMax-M1、MiniMax-M2 三条线。

| 官方模型 ID / 页面写法 | 类型 | 关键信息 | 官方 URL |
|---|---|---|---|
| `MiniMax-Text-01` / `MiniMax-Text-01-hf` | 语言模型 | 456B 总参数，45.9B/token 激活；Lightning Attention + Softmax Attention + MoE；训练 1M context，推理最高 4M context | <https://huggingface.co/MiniMaxAI/MiniMax-Text-01-hf> |
| `MiniMax-VL-01` | 视觉语言模型 | 以 `MiniMax-Text-01` 为 base LLM，附加 ViT + MLP projector | <https://huggingface.co/MiniMaxAI/MiniMax-VL-01> |
| `MiniMax-M1-40k-hf` | reasoning / long-context LLM | M1 的 40K thinking budget 版本；基于 MiniMax-Text-01；456B 总参数，45.9B/token 激活；1M context | <https://huggingface.co/MiniMaxAI/MiniMax-M1-40k-hf> |
| `MiniMax-M1-80k-hf` | reasoning / long-context LLM | M1 的 80K thinking budget 版本；同属 M1 系列 | <https://huggingface.co/MiniMaxAI/MiniMax-M1-80k-hf> |
| `MiniMax-M2` | agentic coding / MoE LLM | 约 230B 总参数、10B 激活参数；官方 HF 模型卡显示 model size 229B params | <https://huggingface.co/MiniMaxAI/MiniMax-M2> |
| `MiniMax-M2.1` | M2 系列后续版本 | M2.1 open weights；面向 coding、tool use、instruction following、long-horizon planning | <https://huggingface.co/MiniMaxAI/MiniMax-M2.1> |
| `MiniMax-M2.5` | M2 系列后续版本 | M2.5 open weights；HF 模型卡显示 model size 229B params；官方正文称有 M2.5 与 M2.5-Lightning 两种服务版本 | <https://huggingface.co/MiniMaxAI/MiniMax-M2.5> |
| `MiniMax-M2.7` | M2 系列后续版本 | M2.7 open weights/API；官方 API 示例使用 `"model": "MiniMax-M2.7"` | <https://huggingface.co/MiniMaxAI/MiniMax-M2.7> |

来源：
- <https://huggingface.co/MiniMaxAI>
- <https://huggingface.co/MiniMaxAI/MiniMax-Text-01-hf>
- <https://huggingface.co/MiniMaxAI/MiniMax-M1-40k-hf>
- <https://huggingface.co/MiniMaxAI/MiniMax-M1-80k-hf>
- <https://huggingface.co/MiniMaxAI/MiniMax-M2>
- <https://huggingface.co/MiniMaxAI/MiniMax-M2.1>
- <https://huggingface.co/MiniMaxAI/MiniMax-M2.5>
- <https://huggingface.co/MiniMaxAI/MiniMax-M2.7>

### 1.2 官方 GitHub 仓库

| 仓库名 | 覆盖模型 | 可验证用途 |
|---|---|---|
| `MiniMax-AI/MiniMax-01` | `MiniMax-Text-01`、`MiniMax-VL-01` | 官方 README / model card / tech report；可用于核对 MiniMax-01 架构与参数 |
| `MiniMax-AI/MiniMax-M1` | `MiniMax-M1-40k`、`MiniMax-M1-80k` | 官方 M1 仓库；可用于核对 M1 与 technical report |
| `MiniMax-AI/MiniMax-M2` | `MiniMax-M2` | 官方 M2 仓库；可用于核对 M2 open-weight release |
| `MiniMax-AI/MiniMax-M2.1` | `MiniMax-M2.1` | 官方 M2.1 仓库；可用于核对 M2.1 release |
| `MiniMax-AI/MiniMax-M2.5` | `MiniMax-M2.5` | 官方 M2.5 仓库；README 与 HF 模型卡同源 |
| `MiniMax-AI/MiniMax-M2.7` | `MiniMax-M2.7` | 官方 M2.7 仓库；可用于核对 M2.7 release |

来源：
- <https://github.com/MiniMax-AI/MiniMax-01>
- <https://github.com/MiniMax-AI/MiniMax-M1>
- <https://github.com/MiniMax-AI/MiniMax-M2>
- <https://github.com/MiniMax-AI/MiniMax-M2.1>
- <https://github.com/MiniMax-AI/MiniMax-M2.5>
- <https://github.com/MiniMax-AI/MiniMax-M2.7>

### 1.3 官方技术博客 / 文档

| 来源 | 覆盖内容 | 官方 URL |
|---|---|---|
| MiniMax M1 news | M1 系列；M1-40k / M1-80k；技术报告和权重入口 | <https://www.minimax.io/news/minimaxm1> |
| MiniMax-01 paper | MiniMax-Text-01 / MiniMax-VL-01；Lightning Attention 与长上下文 | <https://arxiv.org/abs/2501.08313> |
| MiniMax-M1 paper | MiniMax-M1；test-time compute；Lightning Attention | <https://arxiv.org/abs/2506.13585> |
| HF Transformers MiniMax docs | `MiniMax-Text-01-hf` 作为官方示例模型名 | <https://huggingface.co/docs/transformers/model_doc/minimax> |
| HF Transformers MiniMax-M2 docs | `MiniMax-M2`；2025-10-27 release；230B total / 10B active | <https://huggingface.co/docs/transformers/model_doc/minimax_m2> |
| M2 tech blog: full attention | 官方解释 M2 回到 full attention 的工程原因；可支持 T19 中“不能把所有 MiniMax 路线都写成 Lightning/混合注意力”的边界 | <https://huggingface.co/blog/MiniMax-AI/why-did-m2-end-up-as-a-full-attention-model> |
| M2.1 tech blog | `MiniMax-M2.1` 多语言、多任务 coding 泛化 | <https://huggingface.co/blog/MiniMaxAI/multilingual-and-multi-task-coding-with-strong-gen> |
| M2.5 RL blog | `MiniMax-M2.5` 的 Forge / Agent RL 背景 | <https://huggingface.co/blog/MiniMax-AI/forge-scalable-agent-rl-framework-and-algorithm> |
| M2.7 official product page | `MiniMax M2.7` / API model id `MiniMax-M2.7` | <https://www.minimax.io/models/text/m27> |
| MiniMax API model list | API 文档列出 `MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M2.5`、`MiniMax-M2.5-highspeed`、`MiniMax-M2.1`、`MiniMax-M2.1-highspeed`、`MiniMax-M2` | <https://platform.minimax.io/docs/guides/models-intro> |

---

## 2. 当前 seed 中的 MiniMax 写法核对

| 当前 seed / 脚本写法 | 实际情况 | 处理建议 |
|---|---|---|
| `MiniMax` | 公司/模型族名称成立，但不是具体模型 ID | 泛指模型族时可保留；若指具体模型，改成官方 ID |
| `MiniMax 2.5` | 未在官方 HF/GitHub/open-weight 模型 ID 中发现该写法；官方 open-weight ID 是 `MiniMax-M2.5` | seed 中作为具体模型名时改为 `MiniMax-M2.5` |
| `MiniMax M2.5` | 官方官网标题/自然语言中可能出现 `MiniMax M2.7` 这类空格写法；但 HF/GitHub/API 的具体 ID 使用连字符，如 `MiniMax-M2.5` | seed 中作为具体模型名时改为 `MiniMax-M2.5`；标题性自然语言可写 “MiniMax M2.5 系列”，但 sources/known-models 应用连字符 ID |
| `MiniMax M2.5更接近MoE + Lightning Attention/混合注意力路线` | `MiniMax-Text-01` / `MiniMax-M1` 有 Lightning/混合注意力官方来源；但 `MiniMax-M2` 官方博客说明 M2 采用 full attention，`MiniMax-M2.5` 模型卡未把 Lightning Attention 作为其公开核心架构事实 | 若讨论 M2.5，避免写成 Lightning/混合注意力路线；可改为“MiniMax 官方开源的 M2 系列 MoE / agentic coding 路线”，或加 `[!ASSUMPTION]` |
| `MiniMax M2.5` 用于量化/部署收益推断 | 官方 HF 卡可证明 `MiniMax-M2.5` 存在、229B params、F8_E4M3 tensor type；但“910B3 上收益接近翻倍”这类结论不由 MiniMax 官方支持 | 具体量化收益必须下调为理论上限或 `[!ASSUMPTION]` |

---

## 3. 改写时的官方来源映射（可直接用于 seed sources）

### Source 1: MiniMax 官方 Hugging Face 组织

```json
{
  "id": "minimax-hf-org",
  "title": "MiniMaxAI Hugging Face Organization",
  "url": "https://huggingface.co/MiniMaxAI",
  "publisher": "Hugging Face / MiniMax",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "MiniMax 官方 Hugging Face 组织入口",
    "MiniMax-Text-01、MiniMax-M1、MiniMax-M2、MiniMax-M2.1、MiniMax-M2.5、MiniMax-M2.7 等模型入口"
  ]
}
```

### Source 2: MiniMax-M2.5 Model Card

```json
{
  "id": "minimax-m25-card",
  "title": "MiniMax-M2.5 Model Card",
  "url": "https://huggingface.co/MiniMaxAI/MiniMax-M2.5",
  "publisher": "Hugging Face / MiniMax",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "官方模型 ID 为 MiniMax-M2.5",
    "模型卡显示 229B params",
    "模型卡列出 F32、BF16、F8_E4M3 tensor type",
    "M2.5 / M2.5-Lightning 是速度不同、能力相同的服务版本"
  ]
}
```

### Source 3: MiniMax-M2 Model Card

```json
{
  "id": "minimax-m2-card",
  "title": "MiniMax-M2 Model Card",
  "url": "https://huggingface.co/MiniMaxAI/MiniMax-M2",
  "publisher": "Hugging Face / MiniMax",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "官方模型 ID 为 MiniMax-M2",
    "官方描述为 230B total parameters / 10B active parameters 的 MoE 模型",
    "模型卡显示 229B params"
  ]
}
```

### Source 4: MiniMax M2 Full Attention Blog

```json
{
  "id": "minimax-m2-full-attention-blog",
  "title": "Why Did MiniMax M2 End Up as a Full Attention Model?",
  "url": "https://huggingface.co/blog/MiniMax-AI/why-did-m2-end-up-as-a-full-attention-model",
  "publisher": "MiniMax / Hugging Face Blog",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "MiniMax 官方解释 M2 采用 full attention 的工程权衡",
    "用于约束 T19：不要把 MiniMax M2 系列一概写成 Lightning Attention 或混合注意力"
  ]
}
```

### Source 5: MiniMax-Text-01 Model Card

```json
{
  "id": "minimax-text-01-card",
  "title": "MiniMax-Text-01 Model Card",
  "url": "https://huggingface.co/MiniMaxAI/MiniMax-Text-01-hf",
  "publisher": "Hugging Face / MiniMax",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "MiniMax-Text-01 官方模型名",
    "456B total parameters / 45.9B activated per token",
    "Lightning Attention + Softmax Attention + MoE 的混合架构",
    "训练 1M context，推理最高 4M context"
  ]
}
```

### Source 6: MiniMax-M1 Model Card

```json
{
  "id": "minimax-m1-card",
  "title": "MiniMax-M1-80k-hf Model Card",
  "url": "https://huggingface.co/MiniMaxAI/MiniMax-M1-80k-hf",
  "publisher": "Hugging Face / MiniMax",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "MiniMax-M1 官方模型名和 40K / 80K thinking budget 版本",
    "M1 基于 MiniMax-Text-01，使用 MoE + Lightning Attention",
    "1M context"
  ]
}
```

### Source 7: MiniMax API Models

```json
{
  "id": "minimax-api-models",
  "title": "MiniMax API Models",
  "url": "https://platform.minimax.io/docs/guides/models-intro",
  "publisher": "MiniMax API Docs",
  "last_verified": "2026-04-28",
  "confidence": "high",
  "covers": [
    "API 文档列出 MiniMax-M2.7、MiniMax-M2.7-highspeed、MiniMax-M2.5、MiniMax-M2.5-highspeed、MiniMax-M2.1、MiniMax-M2.1-highspeed、MiniMax-M2",
    "可用于区分 open-weight 模型 ID 与 API 服务变体"
  ]
}
```

---

## 4. 教学性比喻 / 假设性数字

- “MiniMax 官方开源的某代旗舰 MoE”可以作为定性表述使用，适合在不想绑定具体版本时替代可疑模型名。
- “MiniMax-M2.5 在 910B3 上量化后速度接近翻倍”没有 MiniMax 官方来源，必须改成理论上限表述或 `[!ASSUMPTION]`。
- “MiniMax-M2.5 更接近 Lightning Attention/混合注意力路线”没有找到 M2.5 官方支持；如果正文只想表达 MiniMax 家族曾经探索 Lightning/混合注意力，应绑定到 `MiniMax-Text-01` 或 `MiniMax-M1`。
- GTS 内部评估、现网压测、910B3/910B4 部署结论都必须用 `[!INTERNAL]` 或 `[!ASSUMPTION]`，不能借 MiniMax 模型卡背书。

---

## 5. 抓取方法与可复现性

抓取关键词：
- `site:huggingface.co/MiniMaxAI MiniMaxAI models MiniMax official Hugging Face`
- `MiniMaxAI GitHub MiniMax-M1 official`
- `MiniMax official technical blog MiniMax M2 model`
- `MiniMax M2.5 MiniMax 2.5 official model`
- `site:huggingface.co/blog/MiniMaxAI MiniMax M2 Why Did MiniMax M2 End Up as a Full Attention Model`
- `site:minimax.io MiniMax M2.7 blog post model self evolution`

抓取日期：2026-04-28

未来重审检查项：
1. MiniMax 官方 HF 组织是否新增 / 下线 M2 系列模型卡。
2. `MiniMax-M2.5` 是否发布更完整的 architecture / config tech report；如发布，再更新 T19 对注意力机制的表述。
3. API 文档中的 highspeed / Lightning 命名是否变化，避免把服务 SKU 写成 open-weight 模型 ID。
