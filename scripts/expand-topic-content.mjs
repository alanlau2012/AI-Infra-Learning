import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, 'resources', 'seed_data.json');
const DIAGRAM_DIR = path.join(ROOT, 'resources', 'topic-diagrams');
const SOURCES_PATH = path.join(ROOT, 'CONTENT_SOURCES.md');

const topicContent = {
  T01: {
    slug: 't01-roofline.svg',
    steps: ['FLOPs', 'Bytes', 'Arithmetic Intensity', 'Roofline 判断', '优化方向'],
    catch: '推理优化先不要问“再加几张卡”，先问这一步到底是在等计算，还是在等数据从 HBM 搬过来。',
    intuition: '可以把 NPU 想成一个很快的厨房，HBM 是仓库到厨房的传送带。Prefill 像一次准备很多份菜，锅和厨师会忙起来；Decode 像每次只做一口，却要反复从仓库把大批食材拿出来，传送带很容易成为瓶颈。',
    mechanism: 'Arithmetic Intensity 等于一次计算消耗的 FLOPs 除以搬运的字节数。数值高，说明搬一次数据能做很多计算，更接近 compute-bound；数值低，说明算子大部分时间在等数据，更接近 memory-bound。LLM 推理里，Prefill 的大矩阵乘通常能把算力吃满，Decode 的单 token GEMV 和 KV 读取则经常被带宽限制。',
    formula: '判断路径是：估算 FLOPs、估算需要读写的权重和 KV 字节数，再与硬件的峰值算力和 HBM 带宽相除。Roofline 图上的拐点就是硬件“算得快”和“搬得快”的分界。低于拐点时，优先减少搬运、复用权重、增大 batch 或一次产出更多 token。',
    scenario: '在 GTS 的推理服务里，MTP、continuous batching、P/D 分离看起来是不同技术，其实都在提高一次权重搬运的产出。特别是 Decode 阶段，如果每次只产出一个 token，再多算力也可能闲着；让一次搬运服务更多请求或更多候选 token，才会直接改善吞吐。',
    mistake: '常见误区是只看 TFLOPS，不看带宽和实际 batch。另一个误区是把 Prefill 的结论套到 Decode：Prefill 优化关注矩阵吞吐和排队，Decode 优化更关注权重/KV 复用、调度粒度和尾延迟。',
    summary: '先用 compute-bound 与 memory-bound 定性，再用 Arithmetic Intensity 定量，最后把优化动作映射到“少搬、复用、多产出”。这是后面所有容量、调度和架构判断的底层坐标系。'
  },
  T02: {
    slug: 't02-kv-cache.svg',
    steps: ['Layers', 'KV Heads', 'Head Dim', 'Seq Len', 'Batch', '显存预算'],
    catch: 'KV Cache 是长上下文和高并发的共同账单：模型越会记，服务端越要付显存。',
    intuition: '把每个用户的上下文想成一本正在写的笔记。每生成一个 token，模型都要把这个 token 在每层 attention 中的 key 和 value 记下来。用户越多、上下文越长，笔记本就越厚，占用的 HBM 也越多。',
    mechanism: 'KV Cache 的核心公式是 2 × num_layers × num_kv_heads × head_dim × seq_len × batch_size × bytes_per_element。这里的 2 来自 K 和 V 两份状态。GQA/MQA 通过减少 KV 头数来压缩缓存，因此同样上下文长度下能承载更多并发。',
    formula: '容量预算应拆成三块：模型权重、KV Cache、运行时开销。权重决定模型能不能放下，KV Cache 决定并发和最大上下文能不能撑住，运行时开销包括激活、临时 buffer、通信和框架预留。做规划时不要把 64GB 或 32GB 全部当作可用 KV 空间。',
    scenario: '例如内部评估 910B3 与 910B4 的模型分层时，不能只问模型文件大小，还要问目标上下文、并发、精度和 GQA 配置。长上下文从 4K 提到 32K，KV Cache 近似线性增长 8 倍，可能直接把原本可跑的并发压到不可接受。',
    mistake: '常见误区是只算权重不算 KV，或者只算单用户不算 batch。另一个误区是把总参数与激活参数混为一谈：MoE 的计算可以稀疏，但所有需要常驻的权重和缓存仍会占显存。',
    summary: 'KV Cache 公式是容量规划的第一把尺。任何模型选型、上下文承诺、并发 SLA 和硬件分级，都应先过这道显存账。'
  },
  T03: {
    slug: 't03-moe-router.svg',
    steps: ['Token', 'Router/Gate', 'Top-K Experts', 'All-to-All', 'Output Merge'],
    catch: 'MoE 的直觉是“只请几位专家干活”，但所有专家的办公楼往往还得租下来。',
    intuition: 'Dense 模型像每个 token 都走完整流水线；MoE 像先经过一个分诊台，只把 token 送给少数专家。这样每 token 计算量下降，但路由、专家负载和跨卡通信会变成新的工程问题。',
    mechanism: 'MoE 要分清总参数和激活参数。总参数决定权重显存和加载成本，激活参数决定每 token 实际计算量。Router 会为每个 token 选择 Top-K expert，专家输出再合并。如果专家分布在多张卡上，还会引入 All-to-All 通信。',
    formula: '推理成本可粗略看作：常驻成本约等于总权重加 KV Cache，单 token 计算约等于被激活专家的 FFN 加 attention。MoE 的收益来自激活稀疏，风险来自路由不均、通信放大、专家热度倾斜和框架适配成熟度。',
    scenario: '在 GTS 场景里，MoE 适合质量接近大模型、速度接近小模型的 agent 循环。但硬件选型时必须先确认总权重能否放下，再看激活参数是否满足延迟目标。单卡放不下时，专家并行带来的通信成本也要纳入吞吐评估。',
    mistake: '常见误区是看到 A3B 就以为只需要 3B 权重显存。A3B 说的是每 token 激活量，不等于总模型常驻量。另一个误区是忽略负载均衡，热门 expert 会让某些卡成为局部瓶颈。',
    summary: 'MoE 是用稀疏计算换质量和吞吐，但它没有免除显存、通信和调度账。评估时总参数、激活参数、专家布局要分开看。'
  },
  T19: {
    slug: 't19-attention-evolution.svg',
    steps: ['MHA', 'MQA', 'GQA', 'MLA', 'Linear Attention', 'Hybrid'],
    catch: 'Attention 演进的主线不是名字越来越多，而是大家都在削减“历史上下文”带来的计算和显存账单。',
    intuition: '标准 attention 像每个新 token 都回头翻完整聊天记录。上下文短时这很自然；上下文长到几十万 token 时，每次回看都会变成巨大的账单。各种新机制，本质上是在决定哪些历史必须精确保留，哪些可以压缩成摘要。',
    mechanism: 'MHA 为每个头保存独立 KV，表达力强但缓存大。MQA/GQA 减少 KV 头数，牺牲少量灵活性换显存。MLA 将 KV 投影到更小的 latent 空间。线性注意力更进一步，用固定大小状态替代完整 KV 历史，让长度扩展更平滑。',
    formula: '复杂度可以按两条线看：softmax attention 需要随序列增长维护 KV，prefill 还会出现 O(n²) 的注意力矩阵；线性注意力倾向 O(n) 流式更新，但精确检索能力通常弱一些。因此 2026 年的方向更多是混合架构，而不是单一路线通吃。',
    scenario: '模型落到 GTS 集群时，attention 机制会直接影响每卡并发和长上下文成本。相同参数规模下，GQA、MLA、DeltaNet 或 CSA/HCA 的 KV 画像完全不同，调度器和显存水位策略也不能照搬。',
    mistake: '常见误区是认为线性注意力一定更好。它更省资源，但在精确复制、needle retrieval、跨段依赖上可能需要 full attention 层补位。另一个误区是只看论文复杂度，不看框架和硬件 kernel 是否成熟。',
    summary: 'Attention 演进是一组压缩历史的方法谱系。理解每种机制如何保存、压缩或检索历史，才能判断它适合低延迟对话、长文档还是 agent 轨迹。'
  },
  T20: {
    slug: 't20-qwen-deltanet.svg',
    steps: ['3 层 Gated DeltaNet', '1 层 Gated Attention', 'MoE/FFN', 'MTP Head', '长上下文部署'],
    catch: 'Qwen3.5/3.6 的混合思路是：多数层用便宜的状态记忆，少数层保留精确回看能力。',
    intuition: '可以把 Gated DeltaNet 想成一本随写随更新的压缩笔记，而 full attention 像偶尔回看原始资料。压缩笔记便宜、稳定、长度友好；原始资料昂贵但细节准。混合架构就是把两者按层分工。',
    mechanism: '公开模型卡显示，Qwen3.5 系列采用 Gated DeltaNet 与 Gated Attention 的混合布局，典型模式是若干 DeltaNet 层后接一层 attention。DeltaNet 层维护固定大小状态，Gated Attention 层保留传统 KV。这样大部分层不再随上下文线性增加 KV Cache。',
    formula: '部署判断可以拆成三步：先看 dense/MoE 与总权重能否放入目标卡，再看只有部分 full attention 层产生传统 KV 时的并发提升，最后看推理框架是否支持 Gated DeltaNet kernel、MTP head 和对应量化格式。',
    scenario: '对 GTS 来说，这类模型的吸引力在于长上下文与 agent 循环成本更低。若 910B3 可以承载某个 dense 版本，混合 attention 会让同样显存下的长上下文并发更友好；但如果 Ascend 适配滞后，理论优势会被 kernel 和调度成本吃掉。',
    mistake: '常见误区是把 Gated DeltaNet 简化成“没有 KV Cache”。更准确地说，它用固定状态替代传统逐 token KV，仍有状态存储和 kernel 成本。另一个误区是忽略少数 full attention 层，它们仍决定精确检索能力和部分显存增长。',
    summary: 'Qwen 混合架构的核心价值是把长上下文成本从“所有层都增长”变成“少数层增长”。评估时要同时看模型结构、框架支持和硬件 kernel。'
  },
  T21: {
    slug: 't21-deepseek-csa-hca.svg',
    steps: ['4x CSA 压缩', 'Top-K Sparse', '128x HCA 压缩', 'Dense on Compressed', 'Sliding Window'],
    catch: 'DeepSeek V4 的注意力思路不是完全不看历史，而是先把历史压短，再决定精确找还是粗略看。',
    intuition: '把 1M token 上下文想成一整座档案馆。CSA 像先把每几页压成摘要，再用索引找到最相关的几摞；HCA 像把整馆压成更短目录，然后每次都扫一遍目录。两者交替，让局部细节和全局视野兼得。',
    mechanism: '公开技术报告摘要描述了 CSA 与 HCA 的混合 attention。CSA 对 KV 做较小倍率压缩，再用 Lightning Indexer 选择 top-k 压缩块，并保留滑动窗口处理最近 token。HCA 使用更高倍率压缩，对压缩后的短序列做 dense attention，提供低成本全局视野。',
    formula: '理解它可以用“压缩率 × 检索方式”两维：CSA 压缩较轻、检索稀疏，适合精确找到相关历史；HCA 压缩更重、检索密集，适合全局粗看。滑动窗口则保证最近上下文不被过度压缩。',
    scenario: 'GTS 近期不一定直接在 910B3 上跑 V4-Pro 级别模型，但这条路线会影响未来开源模型和推理框架。平台需要提前评估 vLLM Ascend、SGLang 或自研 kernel 对非标准 attention 的适配成本。',
    mistake: '常见误区是只记住“KV 变小”，忽略压缩器和索引器本身的计算、精度和工程复杂度。另一个误区是认为所有请求都需要 1M 上下文；短上下文场景可能更看重普通 decode 延迟。',
    summary: 'CSA/HCA 代表长上下文模型从“完整保存历史”走向“压缩、索引、局部保真”的方向。它对平台的启示是：未来瓶颈会越来越多地出现在特殊 attention kernel 和缓存管理。'
  },
  T04: {
    slug: 't04-ascend-910b-tiering.svg',
    steps: ['HBM 容量', '带宽', 'AI Core', '模型规格', '硬件分级'],
    catch: '硬件分级不是贴标签，而是把模型的显存、带宽和延迟画像放到合适的卡上。',
    intuition: '同一辆车跑城市路和高速路表现不同，同一个模型放到不同 NPU 上也会出现不同瓶颈。910B3 与 910B4 的关键差异不只是型号，而是可承载的权重、KV Cache 和并发空间。',
    mechanism: '评估 Ascend 910B 系列时，应分开看 HBM 容量、HBM 带宽、矩阵计算能力、互联和软件栈成熟度。大模型首先受容量约束，其次受 decode 带宽约束；中小模型则更容易被调度开销、batch 策略和多租户干扰影响。',
    formula: '硬件匹配可以按四步走：权重能否放下，目标上下文下 KV 是否够用，prefill/decode 的瓶颈分别是什么，扩到多卡后通信是否可控。只有四步都通过，才算模型与硬件匹配。',
    scenario: '在 GTS 集群规划里，B3 更适合作为大模型和长上下文主力，B4 可承接中小模型、低成本实验或轻量服务。真实策略还要结合机柜密度、故障域、运维复杂度和业务优先级。',
    mistake: '常见误区是按单卡峰值算力排序，而不是按业务瓶颈排序。另一个误区是把“能启动”当作“能生产服务”：生产还要留出 KV、峰值流量、热升级和故障迁移空间。',
    summary: '硬件分级的本质是容量、带宽、计算和运维的共同约束。模型进入资源池前，先做显存账和瓶颈账，能减少后续大量试错。'
  },
  T05: {
    slug: 't05-cann-npu-stack.svg',
    steps: ['应用框架', 'GE', 'TBE/Ascend C', 'Runtime', 'AI Core', 'GM/UB'],
    catch: '自研算子的价值，来自把通用实现改成贴着昇腾数据搬运和计算流水线走。',
    intuition: '高级框架像自动挡汽车，能跑但不一定用尽赛道。自研算子像针对赛道调校变速箱和刹车点：目标不是炫技，而是少搬一次数据、少落一次内存、让 Cube/Vector 单元更连续地工作。',
    mechanism: 'CANN 栈把上层模型图逐步落到硬件执行。算子优化通常围绕 tiling、double buffer、数据从 GM 到 UB 的搬运、Cube 矩阵计算和 Vector 后处理。Attention、FFN、量化/反量化、采样等热点算子，都会影响端到端吞吐。',
    formula: '算子 ROI 可以用三问判断：它是否处在火焰图热点；瓶颈是搬运、计算还是同步；替换后是否减少全局内存读写或 kernel launch。只有命中主路径的优化，才会在服务指标上可见。',
    scenario: 'GTS 自研高性能算子相当于把通用 vLLM/框架适配到 910B 的实际特性。对于 Decode 阶段，哪怕单个算子提升不大，只要它在每 token 每层反复出现，累计收益就会非常可观。',
    mistake: '常见误区是追求单算子 micro benchmark 好看，却没有端到端收益。另一个误区是过早自研所有算子；更稳妥的路径是先用 profiling 找热点，再针对 attention、FFN 和通信边界做少量高价值替换。',
    summary: '自研算子是把模型结构、框架调度和 NPU 存储层级对齐的工程能力。它的价值应以端到端延迟、吞吐和稳定性来衡量。'
  },
  T06: {
    slug: 't06-vllm-pagedattention.svg',
    steps: ['Requests', 'Scheduler', 'Block Table', 'Paged KV Cache', 'Continuous Batching'],
    catch: 'vLLM 的关键不是“更快地算一个请求”，而是“更聪明地把很多请求塞进同一台推理机器”。',
    intuition: '如果把 KV Cache 当成连续大数组，每个请求长度不同，就像停车场只能停固定长度的大车，空间会碎掉。PagedAttention 借鉴操作系统分页，把 KV 切成 block，请求只拿自己需要的页，调度器再持续把新请求插进来。',
    mechanism: 'PagedAttention 用 block table 做逻辑位置到物理 KV block 的映射，减少预留和碎片。Continuous batching 让完成的请求释放资源，新请求随时进入 batch。Prefix caching 复用相同前缀的 KV，chunked prefill 把长 prompt 切块，避免长 prefill 阻塞 decode。',
    formula: '可以把 vLLM 理解成三层：内存层管理 KV block，调度层决定每轮执行哪些 prefill/decode，执行层调用 attention、FFN、采样等 kernel。吞吐提升往往来自三层协同，而不是某一个 kernel 独立变快。',
    scenario: 'GTS MaaS 服务面对的是大量长度不同、到达时间不同、SLA 不同的请求。vLLM 的价值在于提高 NPU 利用率，同时控制 TTFT、ITL 和尾延迟。后续 Ascend 定制也应围绕这些机制判断是否破坏调度收益。',
    mistake: '常见误区是把 batch size 设大就等同于高吞吐。没有连续调度和 KV 管理，大 batch 会拉高尾延迟。另一个误区是只看平均 token/s，不看请求级 TTFT/ITL 分布。',
    summary: 'vLLM 是推理服务的资源操作系统：管 KV、排请求、复用前缀、平衡 prefill 与 decode。理解它，才能理解平台吞吐从哪里来。'
  },
  T07: {
    slug: 't07-vllm-ascend.svg',
    steps: ['vLLM API', 'Ascend Backend', 'CANN Kernel', 'KV Manager', 'GTS 定制'],
    catch: 'vLLM 适配昇腾不是把 CUDA 名字替换成 CANN，而是把调度假设、算子能力和内存模型重新对齐。',
    intuition: '上层 vLLM 像一套交通规则，底层硬件像不同城市的道路。规则可以复用，但红绿灯、车道宽度和匝道设计不同，直接照搬会堵在意想不到的地方。',
    mechanism: '昇腾适配需要覆盖模型加载、权重格式、attention backend、KV cache 布局、通信和采样等路径。vLLM Ascend 项目提供了基础能力，但生产场景还要处理特定模型结构、量化格式、NPU kernel、异常恢复和观测指标。',
    formula: '适配优先级可按“主路径频率 × 性能瓶颈 × 业务覆盖”排序。Decode 每 token 每层调用的算子优先级最高；只在冷启动或少量模型上出现的路径，可以先保持通用实现。',
    scenario: 'GTS 定制应重点关注 910B 上的 attention、MoE、MTP、KV cache 和 P/D 分离支持。目标不是维护一套孤岛框架，而是在 vLLM 生态接口下，把关键瓶颈换成适合 Ascend 的实现。',
    mistake: '常见误区是只验证 demo 能跑，不验证长时间稳定性和尾延迟。另一个误区是改动过深导致跟不上上游 vLLM。定制点越靠近清晰接口，升级成本越可控。',
    summary: 'vLLM 昇腾适配是一项平台工程：上接生态 API，下接硬件 kernel，中间守住调度和缓存语义。成功标准是生产指标，而不是单点功能可用。'
  },
  T08: {
    slug: 't08-prefill-decode.svg',
    steps: ['Prefill Pool', 'KV Transfer', 'Decode Pool', '4P4D', 'SLA Routing'],
    catch: 'P/D 分离的核心，是让“读长 prompt”和“逐 token 生成”不要在同一条队列里互相拖累。',
    intuition: 'Prefill 像一次读完整份材料，工作量大但并行度高；Decode 像边想边写，每次只写一个字但要持续低延迟。把两种工作混在一起，就容易出现长 prompt 把正在生成的用户卡住。',
    mechanism: 'P/D 分离把 prefill 和 decode 放到不同实例或资源池。Prefill 负责计算 prompt 的 KV，随后把 KV 或必要状态交给 decode。4P4D 可以理解为多个 prefiller 和 decoder 的配比设计，用来同时优化 TTFT 与 ITL。',
    formula: '配比判断要看三个量：平均输入长度决定 prefill 压力，平均输出长度和并发决定 decode 压力，KV 传输成本决定分离收益是否被网络吃掉。P/D 分离不是越细越好，传输和调度开销必须小于排队收益。',
    scenario: '在 GTS MaaS 中，企业知识库问答、代码仓库分析、agent 轨迹都会带来长 prompt。将 prefill 独立扩容，可以避免普通对话的 decode 延迟被长上下文请求拖高，也便于给不同业务设置资源池。',
    mistake: '常见误区是把 P/D 分离当成固定 4P4D 模板。真实配比要随输入输出长度、模型大小、网络带宽和 SLA 调整。另一个误区是忽略 KV 传输失败和重试，生产需要清晰的降级路径。',
    summary: 'P/D 分离是把两类不同瓶颈拆开治理：Prefill 追求吞吐和 TTFT，Decode 追求稳定 ITL。配比设计应由流量画像驱动。'
  },
  T09: {
    slug: 't09-mtp-speculative.svg',
    steps: ['Draft/MTP', 'Propose Tokens', 'Target Verify', 'Accept/Reject', 'Faster Decode'],
    catch: 'MTP 的直觉是：既然 Decode 每步搬权重很贵，那就尝试一次多猜几个 token，再由主模型验收。',
    intuition: '普通 Decode 像每次只走一步楼梯；投机推理像先让轻量助手试着跑几步，主模型再检查哪些步没有跑偏。猜对的 token 可以一次通过，猜错再回退，目标是在不改变输出分布的前提下减少主模型调用次数。',
    mechanism: 'Speculative decoding 通常由 draft model、MTP head 或 n-gram 方法提出候选 token，目标模型并行验证这些候选。被接受的 token 直接进入输出，被拒绝的位置按目标模型结果继续生成。收益取决于候选质量、验证开销和 batch 调度。',
    formula: '粗略收益来自接受长度：平均一次验证接受的 token 越多，主模型每 token 的权重搬运成本越低。但如果 draft 太慢、接受率低或验证扩展 batch 破坏调度，端到端 ITL 可能不降反升。',
    scenario: 'GTS 关注 MTP，是因为 Decode 阶段常常 memory-bound。对 agent 循环和代码生成这类重复模式明显的请求，候选 token 接受率可能更高；对高随机采样或短回复，收益会变小。',
    mistake: '常见误区是认为投机推理必然提速。vLLM 文档也提醒不同数据集和采样参数下未必降低 ITL。另一个误区是只看 token/s，不验证输出一致性、显存增量和调度副作用。',
    summary: 'MTP/投机推理是用“多猜再验证”提高一次 Decode 搬运的产出。它适合 memory-bound 场景，但必须以接受率和端到端延迟来评估。'
  },
  T10: {
    slug: 't10-quantization.svg',
    steps: ['FP16/BF16', 'FP8', 'INT8', 'INT4/FP4', 'KV Quant', '硬件匹配'],
    catch: '量化不是把数字变小这么简单，而是在显存、带宽、速度和精度之间做可验证的交换。',
    intuition: '模型权重像一本很厚的字典。用更少位数存储，相当于把字典压缩，搬运更快、占地更少；但压得太狠，词义就会模糊，模型质量下降。',
    mechanism: '常见量化包括权重量化、激活量化和 KV Cache 量化。FP8、INT8、INT4、FP4 的收益和风险不同，取决于硬件是否有高效指令、kernel 是否成熟、模型是否经过校准或 QAT，以及 MoE expert 是否单独处理。',
    formula: '选型时先算显存节省，再看吞吐是否真的提升，最后用业务集验证质量。权重量化主要降低模型常驻和读权重带宽；KV 量化更直接影响长上下文并发；激活量化则更依赖硬件和 kernel。',
    scenario: '在 910B3/B4 分级里，量化可以让原本放不下或并发不足的模型进入可服务区间。但内部上线不能只看 perplexity 或通用榜单，还要看中文、代码、工具调用、长上下文和安全策略上的回归。',
    mistake: '常见误区是认为位数越低越好。低位格式如果缺少高效 kernel，可能只省显存不提速。另一个误区是用单轮问答判断质量，忽略 agent 多轮中误差累积。',
    summary: '量化是资源换质量的工程工具。正确姿势是硬件支持、kernel 性能、显存收益和业务评测四项一起过关。'
  },
  T11: {
    slug: 't11-inference-metrics.svg',
    steps: ['TTFT', 'ITL', 'TPOT', 'Throughput', 'Error/Cost', 'SLO'],
    catch: '推理服务指标不能只看 token/s；用户感知的是等待首字、生成节奏和失败率。',
    intuition: '同样每秒产出很多 token，如果用户等很久才看到第一个字，体验仍然差。指标体系要把平台视角的吞吐和用户视角的延迟放在同一张图上。',
    mechanism: 'TTFT 衡量从请求进入到首 token 的时间，主要受排队和 prefill 影响。ITL/TPOT 衡量后续 token 的节奏，主要受 decode 和调度影响。吞吐看总 tokens/s，错误率看稳定性，显存水位和队列长度帮助定位瓶颈。',
    formula: '指标应按请求维度看分布，而不是只看平均值。P50 代表普通体验，P95/P99 代表尾部风险；同时要按模型、租户、输入长度、输出长度、状态码和资源池切分，避免把问题平均掉。',
    scenario: 'GTS 平台做容量治理时，可以用 TTFT 判断 prefill 池是否拥塞，用 ITL 判断 decode 池和 memory-bound 是否恶化，用 cache usage 判断 KV 是否接近危险水位，用降级次数判断路由策略是否过于激进。',
    mistake: '常见误区是用单一 QPS 或 token/s 做 SLA。另一个误区是指标没有业务标签，导致事故时只能看到“整体慢”，看不到是某个模型、租户或长上下文流量导致。',
    summary: '好的指标体系把用户体验、资源效率和故障定位连起来。TTFT、ITL、吞吐、错误率和成本必须成组使用。'
  },
  T12: {
    slug: 't12-gateway-routing.svg',
    steps: ['Request', 'Policy', 'Model Pool', 'Cluster Score', 'Route/Retry', 'Feedback'],
    catch: '网关不是简单转发器，而是 MaaS 平台把业务意图翻译成资源决策的大脑。',
    intuition: '用户只说“我要调用某个模型”，平台还要判断去哪套集群、用哪个副本、是否限流、能不能降级、失败后是否重试。网关就是这层决策的入口。',
    mechanism: '智能路由通常结合静态策略和动态信号。静态策略包括租户权限、模型版本、地域、成本等级；动态信号包括队列长度、TTFT/ITL、错误率、显存水位和健康检查。请求进入后，网关选择目标集群，并把结果反馈给后续调度。',
    formula: '可把路由评分理解为：可用性硬过滤 + SLA 匹配 + 实时负载评分 + 成本偏好。硬过滤先排除不可用或无权限目标，评分再在候选中选择最合适的资源。',
    scenario: '在 GTS 跨集群服务中，同一个模型可能部署在多个资源池。网关需要在高峰期把请求导向健康集群，对低优先级流量降级，对长上下文请求选择 KV 空间更充足的池，对失败请求做有界重试。',
    mistake: '常见误区是把重试当万能药。推理请求成本高，盲目重试会放大拥塞。另一个误区是路由只看当前负载，不看请求长度和输出预算，导致长请求进入错误资源池。',
    summary: '网关路由连接业务 SLA 与底层资源状态。它越懂模型、队列和成本，MaaS 平台越能在高峰期保持稳定。'
  },
  T13: {
    slug: 't13-traffic-governance.svg',
    steps: ['Quota', 'Rate Limit', 'Priority', 'Degrade', 'Circuit Break', 'Recover'],
    catch: '流量治理的目标不是拒绝用户，而是在资源有限时保护核心体验和系统生命线。',
    intuition: '推理平台像电网，平时大家都能用，高峰时必须区分医院、工厂和普通照明。限流、分级、降级就是在压力来临前定义好谁优先、谁排队、谁用备用方案。',
    mechanism: '限流控制进入系统的速率，配额控制租户长期资源占用，优先级决定拥塞时的排队顺序，降级用小模型、短上下文或非流式方案替代，熔断在下游异常时快速阻止故障扩散。',
    formula: '治理策略应围绕资源瓶颈设计：如果瓶颈是 KV 显存，就限制上下文和并发；如果瓶颈是 decode 带宽，就限制输出 token 或降低低优先级流量；如果瓶颈是网关或依赖服务，就启用熔断和退避。',
    scenario: 'GTS 内部可以按租户、业务线、模型和优先级设置策略。核心生产请求保障 SLA，实验请求允许排队或降级；当某模型池错误率升高时，网关应停止继续打入流量，并把可降级请求转到备用模型。',
    mistake: '常见误区是事故后手工限流。治理规则应提前配置并可观测。另一个误区是只做入口限流，不做输出 token 和长上下文控制，最终仍会被 KV 或 decode 拖垮。',
    summary: '流量治理是把平台承诺写成可执行规则。限流、配额、优先级、降级和熔断要一起设计，才能在高峰和故障中保持可控。'
  },
  T14: {
    slug: 't14-observability.svg',
    steps: ['Metrics', 'Logs', 'Traces', 'Events', 'Dashboards', 'Action'],
    catch: '可观测性不是多画几张大屏，而是让一次慢请求能从网关追到 NPU、从现象追到原因。',
    intuition: '没有可观测性的系统像黑箱，出了问题只能猜。好的观测像给每个请求贴上追踪单：它经过哪里、等了多久、用了多少 KV、在哪个环节失败，都能还原。',
    mechanism: 'Metrics 用于趋势和告警，Logs 用于解释离散事件，Traces 串起跨服务路径。推理平台还需要模型维度、租户维度、请求长度、输出长度、batch、KV 水位、调度队列和硬件利用率等领域指标。',
    formula: '排障链路可以按“入口耗时、排队耗时、prefill、decode、下游返回”拆段。每段都要有耗时、错误和资源标签。这样看到 TTFT 升高时，能判断是网关排队、prefill 饱和，还是模型加载/缓存异常。',
    scenario: 'GTS 做 MaaS 运维时，观测系统应支持按模型版本、集群、卡型、租户和请求类别下钻。一次容量事故后，团队能用同一套数据复盘：触发信号是什么，路由如何变化，降级是否生效。',
    mistake: '常见误区是指标很多但没有统一 request_id 或 trace_id。另一个误区是只监控 GPU/NPU 利用率，不监控用户侧 TTFT/ITL，导致资源看似忙，体验却不可解释。',
    summary: '可观测性是平台的反馈系统。它把指标、日志、链路和事件连成闭环，让优化、扩容和故障处理有证据。'
  },
  T15: {
    slug: 't15-multitenancy.svg',
    steps: ['Tenant', 'Quota', 'Priority', 'Isolation', 'Accounting', 'Fairness'],
    catch: '多租户治理要解决的不是“谁能用”，而是“大家同时用时谁不该互相伤害”。',
    intuition: '一个共享集群像联合办公空间。没有配额，少数团队会占满会议室；没有隔离，一个团队的实验会影响生产会议；没有计量，谁用了多少也说不清。',
    mechanism: '多租户治理包括身份和权限、资源配额、优先级队列、模型访问策略、并发和 token 预算、成本计量以及故障隔离。推理场景还要特别关注 KV Cache 和长上下文，因为它们会长时间占用显存。',
    formula: '公平性不是简单平均，而是按业务等级和承诺分配。可用资源先满足高优先级 SLO，再把剩余容量按配额或权重分给其他租户。超额使用可以排队、限速或转入低成本模型。',
    scenario: 'GTS 内部平台可以把生产、研发、压测、离线评估分成不同资源池或优先级。生产租户获得稳定 SLA，研发租户获得弹性额度，压测流量必须被标记，避免误伤线上容量判断。',
    mistake: '常见误区是只按 QPS 配额，不按 token、上下文和并发计量。另一个误区是权限与资源策略分离，导致用户能调用模型，却没有对应容量保障。',
    summary: '多租户治理把共享资源变成可承诺、可计量、可隔离的服务。它是 MaaS 从工具走向平台的关键能力。'
  },
  T16: {
    slug: 't16-model-lifecycle.svg',
    steps: ['Register', 'Evaluate', 'Deploy', 'Canary', 'Monitor', 'Rollback'],
    catch: '模型生命周期管理的目标，是让模型升级像工程发布，而不是一次高风险手工替换。',
    intuition: '模型不是上传后就结束的文件，而是一条从准入、评测、部署、灰度、监控到回滚的流水线。每个环节都少一点随意，生产事故就少一分概率。',
    mechanism: '生命周期管理包括模型元数据、权重与 tokenizer 版本、量化格式、依赖框架、评测报告、部署配置、灰度策略、线上指标和回滚记录。推理平台还要记录卡型兼容、最大上下文、推荐 batch 和已知限制。',
    formula: '上线门禁可以分为功能正确性、质量评测、性能压测、安全策略和回滚可行性。任何一项不过关，都不应进入生产默认版本。灰度期间要同时比较新旧版本的质量、TTFT/ITL、错误率和成本。',
    scenario: 'GTS 需要频繁评估 Qwen、DeepSeek、MiniMax 等模型族。把每次评估固化为生命周期记录，可以避免“某模型之前好像能跑”的口头经验，也便于不同卡型和不同业务复用结论。',
    mistake: '常见误区是只保存模型名，不保存完整依赖和配置。另一个误区是没有回滚演练，等线上异常时才发现旧版本权重、镜像或路由策略已经不可用。',
    summary: '模型生命周期管理把模型当作生产制品治理。版本、评测、部署和回滚形成闭环，平台才能稳定吸收模型快速迭代。'
  },
  T17: {
    slug: 't17-maas-architecture.svg',
    steps: ['Portal/API', 'Gateway', 'Scheduler', 'Serving Runtime', 'Model Registry', 'Observability'],
    catch: 'MaaS 平台不是一个推理进程，而是一套把模型能力变成可运营服务的系统。',
    intuition: '单机推理像开一家小店，MaaS 像经营连锁服务：要有菜单、收银、排队、库存、配送、监控和售后。模型只是菜单上的菜，平台负责让它稳定、可控、可计量地交付。',
    mechanism: '典型 MaaS 架构包括用户入口/API、鉴权计费、网关路由、调度和资源池、推理 runtime、模型仓库、配置中心、观测告警和运维发布。每层都有独立职责，但最终要围绕请求生命周期串起来。',
    formula: '请求链路可拆成：鉴权与策略检查，选择模型和资源池，进入队列和推理 runtime，流式返回 token，记录指标与用量。架构设计要保证每段都能限流、观测、重试或降级。',
    scenario: 'GTS 的 MaaS 平台价值在于把 910B 集群、自研算子、vLLM 适配、模型评测和网关治理组合成统一服务。对业务方来说，看到的是稳定 API；对平台方来说，背后是资源效率和 SLA 的持续平衡。',
    mistake: '常见误区是把 MaaS 等同于 OpenAI-compatible API。API 只是入口，真正难的是容量、隔离、模型生命周期、流量治理和故障恢复。另一个误区是先做复杂功能，忽略 Phase 1 的学习和认知对齐。',
    summary: 'MaaS 是模型、硬件、服务治理和运营能力的组合。理解全景架构，才能把单点优化放回平台价值链里。'
  },
  T18: {
    slug: 't18-hardware-strategy.svg',
    steps: ['Model Trends', 'Hardware Roadmap', 'Software Stack', 'Cost/SLA', 'Competitive Position'],
    catch: '硬件代际策略不是追最新芯片，而是判断未来模型趋势会把瓶颈推向哪里。',
    intuition: '如果未来模型更长上下文、更稀疏、更依赖特殊 attention，那么平台竞争力就不只来自算力，还来自带宽、显存、互联、kernel 生态和适配速度。',
    mechanism: '竞争力定位要同时看模型结构趋势、硬件供给、软件栈成熟度、成本、交付周期和团队能力。Dense、MoE、混合 attention、低精度量化、MTP 都会改变硬件需求曲线。',
    formula: '策略评估可以用三层：短期看现有卡能否支撑目标模型和 SLA；中期看软件栈能否快速适配新模型结构；长期看硬件路线是否匹配行业从算力瓶颈转向带宽、显存和特殊 kernel 的趋势。',
    scenario: 'GTS 若要形成差异化，不能只采购硬件，还要积累 Ascend kernel、vLLM 适配、模型评测和容量治理经验。这样当新一代模型出现时，团队能快速判断“能不能跑、值不值得跑、怎么跑得稳”。',
    mistake: '常见误区是把代际升级理解成线性替换。新硬件如果软件栈不成熟，短期生产收益可能低于预期。另一个误区是忽略业务结构，不同业务对延迟、上下文、成本的权重不同。',
    summary: '硬件战略的核心是把模型趋势、平台软件和业务 SLA 对齐。真正的竞争力来自硬件能力与工程落地速度的乘积。'
  }
};

const sourceRows = [
  ['T01', 'Roofline 与 memory-bound 判断', 'Williams et al., Roofline model paper: https://crd.lbl.gov/assets/pubs_presos/roofline_2009.pdf; NVIDIA Memory Limited Layers guide: https://docs.nvidia.com/deeplearning/performance/dl-performance-memory-limited/index.html'],
  ['T02', 'KV Cache、MQA/GQA、长上下文显存', 'GQA paper: https://arxiv.org/abs/2305.13245; Multi-Query Attention paper: https://arxiv.org/abs/1911.02150'],
  ['T03', 'MoE routing 与激活参数', 'Switch Transformers: https://arxiv.org/abs/2101.03961; Mixtral model card: https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1'],
  ['T19', 'Attention 机制演进', 'Attention Is All You Need: https://arxiv.org/abs/1706.03762; Gated Delta Networks: https://arxiv.org/abs/2412.06464'],
  ['T20', 'Qwen3.5/3.6 Gated DeltaNet 混合架构', 'Qwen3.5 model card: https://huggingface.co/Qwen/Qwen3.5-397B-A17B; Qwen3.5 GitHub: https://github.com/QwenLM/Qwen3.5'],
  ['T21', 'DeepSeek V4 CSA/HCA', 'DeepSeek V4 HF blog and technical report links: https://huggingface.co/blog/deepseekv4; DeepSeek model card commit: https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/commit/a7aaed80dd2df27620eb534454253ea25eb11c7a'],
  ['T04', 'Ascend 硬件与容量规划', 'Huawei Ascend documentation portal: https://www.hiascend.com/document; CANN documentation: https://www.hiascend.com/document/detail/zh/canncommercial'],
  ['T05', 'CANN/Ascend C 与算子优化', 'Ascend C documentation: https://www.hiascend.com/document/detail/zh/canncommercial/80RC3/developmentguide/opdevg/Ascendcopdevg'],
  ['T06', 'vLLM PagedAttention、prefix caching、chunked prefill', 'vLLM PagedAttention paper: https://arxiv.org/abs/2309.06180; vLLM docs: https://docs.vllm.ai/'],
  ['T07', 'vLLM Ascend 适配', 'vLLM Ascend documentation: https://docs.vllm.ai/projects/ascend/en/main/'],
  ['T08', 'Disaggregated Prefill/P-D 分离', 'vLLM disaggregated prefilling: https://docs.vllm.ai/usage/disagg_prefill/; vLLM Ascend disaggregated prefill: https://docs.vllm.ai/projects/ascend/en/main/developer_guide/feature_guide/disaggregated_prefill.html'],
  ['T09', 'Speculative decoding/MTP', 'vLLM speculative decoding docs: https://docs.vllm.ai/en/latest/features/spec_decode.html; Speculative Sampling paper: https://arxiv.org/abs/2302.01318'],
  ['T10', '量化与硬件支持', 'vLLM quantization docs: https://docs.vllm.ai/en/stable/features/quantization/; LLM Compressor docs: https://docs.vllm.ai/projects/llm-compressor/en/latest/'],
  ['T11', '推理服务指标', 'vLLM production metrics: https://docs.vllm.ai/en/latest/usage/metrics.html; Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/'],
  ['T12', '网关路由与流量控制', 'Envoy global rate limiting: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting.html; Envoy circuit breakers: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers'],
  ['T13', '限流、降级、熔断', 'Envoy rate limiting and circuit breaker docs: https://www.envoyproxy.io/docs/envoy/latest/'],
  ['T14', '可观测性', 'OpenTelemetry documentation: https://opentelemetry.io/docs/; Prometheus documentation: https://prometheus.io/docs/'],
  ['T15', '多租户资源治理', 'Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/; Kubernetes Pod QoS: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/'],
  ['T16', '模型生命周期', 'Hugging Face Hub model cards: https://huggingface.co/docs/hub/model-cards; vLLM serving docs: https://docs.vllm.ai/'],
  ['T17', 'MaaS 平台架构', 'OpenAI-compatible serving in vLLM: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html; OpenTelemetry docs: https://opentelemetry.io/docs/'],
  ['T18', '硬件代际策略', 'DeepSeek-V3 technical report: https://arxiv.org/abs/2412.19437; vLLM hardware support docs: https://docs.vllm.ai/en/latest/models/supported_models.html']
];

function topicBody(topic, content) {
  return [
    '## 一句话抓手',
    '',
    `> ${content.catch}`,
    '',
    `![${topic.name} 图解](learning-asset://topic-diagrams/${content.slug})`,
    '',
    '## 先建立直觉',
    '',
    content.intuition,
    '',
    '## 机制拆解',
    '',
    content.mechanism,
    '',
    '## 公式/判断',
    '',
    content.formula,
    '',
    '## 放到 GTS 场景',
    '',
    content.scenario,
    '',
    '## 常见误区',
    '',
    content.mistake,
    '',
    '## 小结',
    '',
    content.summary
  ].join('\n');
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function text(x, y, value, options = {}) {
  const {
    size = 14,
    color = '#dbe7f6',
    anchor = 'start',
    weight = 500,
    family = 'Inter, Microsoft YaHei, Segoe UI, sans-serif'
  } = options;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="${family}">${escapeXml(value)}</text>`;
}

function rect(x, y, width, height, options = {}) {
  const { fill = '#101b2d', stroke = '#334155', radius = 8, opacity = 1 } = options;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" opacity="${opacity}"/>`;
}

function line(x1, y1, x2, y2, options = {}) {
  const { color = '#38bdf8', width = 3, dash = '' } = options;
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="${width}"${dashAttr} fill="none"/>`;
}

function arrow(x1, y1, x2, y2, options = {}) {
  const { color = '#38bdf8', width = 3, dash = '' } = options;
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="${width}"${dashAttr} marker-end="url(#arrow)" fill="none"/>`;
}

function box(x, y, width, height, title, subtitle = '', options = {}) {
  const titleY = subtitle ? y + height / 2 - 4 : y + height / 2 + 5;
  const subtitleMarkup = subtitle ? text(x + width / 2, y + height / 2 + 18, subtitle, {
    anchor: 'middle',
    color: '#93c5fd',
    size: 12,
    weight: 600
  }) : '';
  return `${rect(x, y, width, height, options)}
${text(x + width / 2, titleY, title, { anchor: 'middle', color: '#f8fafc', size: 15, weight: 800 })}
${subtitleMarkup}`;
}

function circle(cx, cy, r, label, options = {}) {
  const { fill = '#102033', stroke = '#2dd4bf', color = '#f8fafc' } = options;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
${text(cx, cy + 5, label, { anchor: 'middle', color, size: 14, weight: 800 })}`;
}

function diagramShell(topic, content, body, footnote) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(topic.name)} 图解</title>
  <desc id="desc">${escapeXml(content.catch)}</desc>
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M2,2 L10,6 L2,10 Z" fill="#38bdf8"/>
    </marker>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="960" height="420" fill="url(#bg)"/>
  <rect x="24" y="24" width="912" height="372" rx="10" fill="#0b1220" stroke="#263143"/>
  ${text(48, 70, topic.id, { color: '#5eead4', size: 18, weight: 900 })}
  ${text(98, 70, topic.name, { color: '#f8fafc', size: 22, weight: 900 })}
  ${text(48, 104, content.catch, { color: '#cbd5e1', size: 15, weight: 600 })}
  ${body}
  ${text(48, 372, footnote, { color: '#94a3b8', size: 13 })}
</svg>
`;
}

function makeDiagram(topic, content) {
  const axis = `${line(108, 322, 108, 152, { color: '#64748b', width: 2 })}${line(108, 322, 482, 322, { color: '#64748b', width: 2 })}`;
  const diagrams = {
    T01: () => diagramShell(topic, content, `
      ${axis}
      ${text(72, 160, '吞吐', { size: 13, color: '#94a3b8' })}
      ${text(360, 346, 'Arithmetic Intensity', { size: 13, color: '#94a3b8' })}
      <path d="M108 306 C170 278, 244 228, 314 184 L482 184" stroke="#5eead4" stroke-width="4" fill="none"/>
      ${line(314, 322, 314, 184, { color: '#facc15', width: 2, dash: '6 6' })}
      ${circle(188, 270, 24, 'D', { fill: '#172554', stroke: '#60a5fa' })}
      ${text(150, 238, 'Decode', { color: '#bfdbfe', weight: 800 })}
      ${text(142, 288, 'memory-bound', { color: '#bfdbfe', size: 12 })}
      ${circle(398, 184, 24, 'P', { fill: '#064e3b', stroke: '#34d399' })}
      ${text(366, 151, 'Prefill', { color: '#bbf7d0', weight: 800 })}
      ${text(352, 202, 'compute-bound', { color: '#bbf7d0', size: 12 })}
      ${box(560, 154, 296, 58, '低于拐点：少搬数据', '权重复用 / batch / MTP', { stroke: '#60a5fa' })}
      ${box(560, 236, 296, 58, '高于拐点：吃满算力', '矩阵吞吐 / kernel / 并行', { stroke: '#34d399' })}
    `, '读图：先定位请求在 Roofline 的哪一侧，再决定优化方向。'),
    T02: () => diagramShell(topic, content, `
      ${box(60, 146, 360, 72, 'KV Cache = 2 × layers × kv_heads × head_dim', '× seq_len × batch × bytes', { stroke: '#5eead4' })}
      ${arrow(420, 182, 510, 182)}
      ${rect(540, 142, 72, 178, { fill: '#172554', stroke: '#60a5fa' })}
      ${rect(620, 188, 72, 132, { fill: '#064e3b', stroke: '#34d399' })}
      ${rect(700, 232, 72, 88, { fill: '#422006', stroke: '#facc15' })}
      ${text(576, 342, '权重', { anchor: 'middle', size: 13 })}
      ${text(656, 342, 'KV', { anchor: 'middle', size: 13 })}
      ${text(736, 342, '运行时', { anchor: 'middle', size: 13 })}
      ${text(600, 130, '显存预算不是只看模型文件', { color: '#f8fafc', weight: 800 })}
      ${box(80, 250, 116, 52, 'GQA/MQA', '减少 KV 头', { stroke: '#38bdf8' })}
      ${box(220, 250, 116, 52, '长上下文', '线性放大', { stroke: '#facc15' })}
    `, '读图：KV Cache 随上下文和并发线性增长，是容量规划的核心账单。'),
    T03: () => diagramShell(topic, content, `
      ${circle(110, 230, 34, 'Token', { fill: '#172554', stroke: '#60a5fa' })}
      ${arrow(145, 230, 260, 230)}
      ${box(260, 190, 140, 80, 'Router / Gate', 'Top-K', { stroke: '#facc15' })}
      ${[0, 1, 2, 3, 4].map((i) => {
        const y = 138 + i * 48;
        return `${arrow(400, 230, 560, y + 20, { width: i === 1 || i === 3 ? 4 : 2, color: i === 1 || i === 3 ? '#5eead4' : '#475569', dash: i === 1 || i === 3 ? '' : '5 6' })}
        ${box(570, y, 130, 40, `Expert ${i + 1}`, i === 1 || i === 3 ? 'activated' : 'idle', { stroke: i === 1 || i === 3 ? '#5eead4' : '#475569', fill: i === 1 || i === 3 ? '#102033' : '#0f172a' })}`;
      }).join('')}
      ${box(760, 188, 110, 84, 'Merge', '输出合并', { stroke: '#38bdf8' })}
      ${arrow(700, 206, 760, 220)}
      ${arrow(700, 302, 760, 240)}
      ${text(88, 322, '总参数占显存', { color: '#facc15', weight: 800 })}
      ${text(560, 322, '激活参数决定每 token 计算量', { color: '#5eead4', weight: 800 })}
    `, '读图：MoE 省的是每 token 计算，不自动省掉所有常驻权重和通信。'),
    T19: () => diagramShell(topic, content, `
      ${line(96, 236, 820, 236, { color: '#475569', width: 2 })}
      ${['MHA', 'MQA', 'GQA', 'MLA', 'Linear', 'Hybrid'].map((v, i) => {
        const x = 120 + i * 136;
        const h = [118, 82, 64, 44, 28, 48][i];
        return `${circle(x, 236, 18, String(i + 1), { fill: '#172554', stroke: '#60a5fa' })}
        ${text(x, 202, v, { anchor: 'middle', color: '#f8fafc', weight: 900 })}
        ${rect(x - 26, 260, 52, h, { fill: i < 3 ? '#172554' : '#064e3b', stroke: i < 3 ? '#60a5fa' : '#34d399', radius: 5 })}
        ${text(x, 260 + h + 20, i === 0 ? 'KV 大' : i === 5 ? '混合' : '更小', { anchor: 'middle', size: 12, color: '#cbd5e1' })}`;
      }).join('')}
      ${text(472, 156, '主线：减少完整历史 KV 的保存和读取成本', { anchor: 'middle', color: '#5eead4', size: 17, weight: 900 })}
      ${box(640, 128, 210, 54, '表达力 vs 成本', '不是单一路线通吃', { stroke: '#facc15' })}
    `, '读图：Attention 演进是在 KV 成本和精确回看能力之间取平衡。'),
    T20: () => diagramShell(topic, content, `
      ${[0, 1, 2, 3].map((block) => {
        const x = 88 + block * 204;
        return `${rect(x, 150, 164, 150, { stroke: '#334155', fill: '#0f172a' })}
        ${[0, 1, 2].map((i) => rect(x + 18 + i * 42, 174, 34, 74, { fill: '#064e3b', stroke: '#34d399', radius: 5 })).join('')}
        ${rect(x + 18 + 3 * 42, 174, 34, 74, { fill: '#172554', stroke: '#60a5fa', radius: 5 })}
        ${text(x + 69, 268, '3 × DeltaNet', { anchor: 'middle', color: '#bbf7d0', size: 12, weight: 800 })}
        ${text(x + 140, 268, '1 × Attn', { anchor: 'middle', color: '#bfdbfe', size: 12, weight: 800 })}`;
      }).join('')}
      ${text(480, 130, '3:1 混合层：多数层固定状态，少数层保留 full attention', { anchor: 'middle', color: '#f8fafc', size: 17, weight: 900 })}
      ${box(150, 324, 250, 42, '传统 KV 只来自少数 attention 层', '', { stroke: '#60a5fa' })}
      ${box(560, 324, 250, 42, 'DeltaNet 用固定状态降低长上下文成本', '', { stroke: '#34d399' })}
    `, '读图：Qwen 混合架构把长上下文成本集中到少数 full attention 层。'),
    T21: () => diagramShell(topic, content, `
      ${box(80, 150, 132, 58, '原始 KV', '1M context', { stroke: '#60a5fa' })}
      ${arrow(212, 180, 330, 152)}${arrow(212, 180, 330, 264)}
      ${box(330, 122, 190, 64, 'CSA', '4x 压缩 + Top-K 索引', { stroke: '#5eead4' })}
      ${box(330, 236, 190, 64, 'HCA', '128x 压缩 + dense', { stroke: '#facc15' })}
      ${arrow(520, 154, 680, 154)}${arrow(520, 268, 680, 268)}
      ${box(680, 126, 190, 56, '精确稀疏检索', '找相关历史', { stroke: '#34d399' })}
      ${box(680, 240, 190, 56, '低成本全局视野', '看压缩全局', { stroke: '#facc15' })}
      ${line(250, 330, 838, 330, { color: '#fb7185', width: 3 })}
      ${text(544, 354, 'Sliding Window：最近 token 保持局部细节，不被过度压缩', { anchor: 'middle', color: '#fecaca', weight: 800 })}
    `, '读图：DeepSeek V4 用压缩、索引和滑动窗口组合治理超长上下文。'),
    T04: () => diagramShell(topic, content, `
      ${box(78, 146, 230, 158, '910B3 资源池', '大模型 / 长上下文 / 高并发', { stroke: '#5eead4' })}
      ${rect(104, 224, 44, 58, { fill: '#172554', stroke: '#60a5fa' })}${rect(160, 188, 44, 94, { fill: '#064e3b', stroke: '#34d399' })}${rect(216, 246, 44, 36, { fill: '#422006', stroke: '#facc15' })}
      ${box(374, 146, 230, 158, '910B4 资源池', '中小模型 / 成本优先 / 实验', { stroke: '#60a5fa' })}
      ${rect(400, 242, 44, 40, { fill: '#172554', stroke: '#60a5fa' })}${rect(456, 214, 44, 68, { fill: '#064e3b', stroke: '#34d399' })}${rect(512, 254, 44, 28, { fill: '#422006', stroke: '#facc15' })}
      ${box(684, 162, 190, 52, '权重能否放下', '', { stroke: '#facc15' })}
      ${box(684, 232, 190, 52, 'KV 是否够用', '', { stroke: '#34d399' })}
      ${arrow(604, 224, 684, 188)}${arrow(604, 224, 684, 258)}
    `, '读图：硬件分级要同时看容量、带宽、模型画像和业务成本。'),
    T05: () => diagramShell(topic, content, `
      ${['AI Core: Cube / Vector / Scalar', 'Runtime', 'TBE / Ascend C 自研算子', 'GE 图优化', 'vLLM / PyTorch / 应用'].map((v, i) => {
        const w = 620 - i * 68;
        const x = 170 + i * 34;
        const y = 292 - i * 42;
        const colors = ['#5eead4', '#38bdf8', '#facc15', '#60a5fa', '#a78bfa'];
        return `${rect(x, y, w, 34, { stroke: colors[i], fill: '#101b2d' })}${text(480, y + 23, v, { anchor: 'middle', color: '#f8fafc', weight: 800 })}`;
      }).join('')}
      ${box(72, 150, 142, 70, 'GM → UB', '少搬/复用', { stroke: '#38bdf8' })}
      ${box(746, 150, 142, 70, 'Tiling', '流水线', { stroke: '#facc15' })}
      ${arrow(214, 186, 318, 272)}${arrow(746, 186, 642, 272)}
    `, '读图：自研算子价值来自贴合 Ascend 存储层级和执行流水线。'),
    T06: () => diagramShell(topic, content, `
      ${box(58, 150, 150, 74, '请求队列', '不同长度', { stroke: '#60a5fa' })}
      ${arrow(208, 187, 290, 187)}
      ${box(290, 150, 150, 74, 'Scheduler', 'continuous batching', { stroke: '#5eead4' })}
      ${arrow(440, 187, 528, 187)}
      ${rect(528, 140, 280, 150, { stroke: '#38bdf8' })}
      ${text(668, 166, 'Paged KV Cache', { anchor: 'middle', color: '#f8fafc', weight: 900 })}
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => rect(558 + c * 46, 188 + r * 20, 34, 14, { fill: c <= 3 - r ? '#164e63' : '#1e293b', stroke: '#334155', radius: 3 })).join('')).join('')}
      ${box(560, 306, 210, 44, 'Block Table', '逻辑页 → 物理页', { stroke: '#facc15' })}
      ${arrow(660, 290, 660, 306)}
    `, '读图：vLLM 像 KV Cache 的操作系统，用分页和连续调度减少浪费。'),
    T07: () => diagramShell(topic, content, `
      ${box(72, 142, 176, 70, 'vLLM 语义', 'API / scheduler / KV', { stroke: '#5eead4' })}
      ${box(392, 142, 176, 70, 'Ascend Backend', '算子与内存布局', { stroke: '#facc15' })}
      ${box(712, 142, 176, 70, 'CANN / NPU', 'AI Core 执行', { stroke: '#60a5fa' })}
      ${arrow(248, 177, 392, 177)}${arrow(568, 177, 712, 177)}
      ${line(480, 220, 480, 332, { color: '#475569', width: 2, dash: '5 6' })}
      ${text(480, 244, '适配边界', { anchor: 'middle', color: '#94a3b8', weight: 800 })}
      ${box(120, 278, 210, 54, '保持上游接口', '减少升级成本', { stroke: '#38bdf8' })}
      ${box(630, 278, 210, 54, '替换热点 kernel', '端到端收益', { stroke: '#34d399' })}
    `, '读图：适配不是平移代码，而是在稳定接口下替换关键瓶颈。'),
    T08: () => diagramShell(topic, content, `
      ${box(72, 148, 250, 120, 'Prefill Pool', '长 prompt / 高并行 / TTFT', { stroke: '#5eead4' })}
      ${box(638, 148, 250, 120, 'Decode Pool', '逐 token / 低 ITL / 稳定节奏', { stroke: '#60a5fa' })}
      ${arrow(322, 208, 638, 208, { color: '#facc15', width: 4 })}
      ${text(480, 192, 'KV / 状态传输', { anchor: 'middle', color: '#facc15', weight: 900 })}
      ${[0, 1, 2, 3].map((i) => rect(104 + i * 46, 226, 34, 18, { fill: '#064e3b', stroke: '#34d399' })).join('')}
      ${[0, 1, 2, 3].map((i) => rect(672 + i * 46, 226, 34, 18, { fill: '#172554', stroke: '#60a5fa' })).join('')}
      ${box(382, 282, 196, 52, '4P4D 是配比问题', '由流量画像决定', { stroke: '#38bdf8' })}
    `, '读图：P/D 分离把 prefill 和 decode 两种瓶颈拆开治理。'),
    T09: () => diagramShell(topic, content, `
      ${box(80, 154, 170, 66, 'MTP / Draft', '一次猜多步', { stroke: '#5eead4' })}
      ${arrow(250, 187, 380, 187)}
      ${box(380, 138, 202, 98, 'Target Verify', '主模型并行验收', { stroke: '#facc15' })}
      ${arrow(582, 170, 722, 150, { color: '#34d399' })}
      ${arrow(582, 206, 722, 248, { color: '#fb7185', dash: '6 6' })}
      ${box(722, 118, 154, 60, 'Accept', '直接输出', { stroke: '#34d399' })}
      ${box(722, 226, 154, 60, 'Reject', '回退续写', { stroke: '#fb7185' })}
      ${[0, 1, 2, 3, 4].map((i) => circle(118 + i * 30, 274, 10, String(i + 1), { fill: '#172554', stroke: '#60a5fa' })).join('')}
      ${text(82, 318, '收益取决于平均接受 token 数，而不是“开了投机”四个字。', { color: '#cbd5e1', weight: 800 })}
    `, '读图：投机推理用候选 token 换更少主模型 decode 步数。'),
    T10: () => diagramShell(topic, content, `
      ${['FP16/BF16', 'FP8', 'INT8', 'INT4 / FP4'].map((v, i) => {
        const w = 280 - i * 42;
        return `${rect(120 + i * 42, 144 + i * 48, w, 34, { stroke: ['#60a5fa', '#5eead4', '#facc15', '#fb7185'][i] })}${text(260, 168 + i * 48, v, { anchor: 'middle', weight: 900 })}`;
      }).join('')}
      ${arrow(454, 160, 662, 160)}${arrow(454, 304, 662, 304)}
      ${box(662, 132, 190, 58, '显存/带宽下降', '更容易放下', { stroke: '#34d399' })}
      ${box(662, 276, 190, 58, '精度/适配风险上升', '需要业务评测', { stroke: '#fb7185' })}
      ${box(322, 310, 190, 44, 'KV Quant', '长上下文并发', { stroke: '#38bdf8' })}
    `, '读图：量化是显存、带宽、速度和质量之间的交换。'),
    T11: () => diagramShell(topic, content, `
      ${circle(480, 168, 42, 'SLO', { fill: '#064e3b', stroke: '#5eead4' })}
      ${['TTFT 首字', 'ITL 节奏', '吞吐 tokens/s', '错误率', '成本/卡时'].map((v, i) => {
        const x = [160, 320, 480, 640, 800][i];
        const y = i % 2 === 0 ? 286 : 250;
        return `${arrow(480, 210, x, y - 30, { color: '#475569', width: 2 })}${box(x - 70, y - 30, 140, 58, v, i < 2 ? '用户体验' : '平台效率', { stroke: i < 2 ? '#60a5fa' : '#facc15' })}`;
      }).join('')}
      ${text(480, 344, '看分布：P50 / P95 / P99，而不是只看平均值', { anchor: 'middle', color: '#cbd5e1', weight: 800 })}
    `, '读图：指标体系要同时解释用户体验和资源效率。'),
    T12: () => diagramShell(topic, content, `
      ${box(60, 172, 140, 74, '请求', '模型/租户/SLA', { stroke: '#60a5fa' })}
      ${arrow(200, 209, 300, 209)}
      ${rect(300, 132, 240, 156, { stroke: '#5eead4' })}
      ${text(420, 162, '路由评分', { anchor: 'middle', weight: 900, color: '#f8fafc' })}
      ${['权限硬过滤', 'SLA 匹配', '实时负载', '成本偏好'].map((v, i) => text(330, 192 + i * 26, `• ${v}`, { color: '#cbd5e1', weight: 700 })).join('')}
      ${arrow(540, 209, 640, 172)}${arrow(540, 209, 640, 246)}
      ${box(640, 136, 220, 58, 'Cluster A', '健康 / 低队列', { stroke: '#34d399' })}
      ${box(640, 224, 220, 58, 'Cluster B', '高水位 / 降权', { stroke: '#fb7185' })}
    `, '读图：网关把业务意图和实时资源状态合成路由决策。'),
    T13: () => diagramShell(topic, content, `
      ${rect(140, 130, 680, 50, { stroke: '#60a5fa' })}${text(480, 162, '入口流量', { anchor: 'middle', weight: 900 })}
      ${rect(190, 198, 580, 46, { stroke: '#5eead4' })}${text(480, 228, '配额 / 限流', { anchor: 'middle', weight: 900 })}
      ${rect(250, 262, 460, 46, { stroke: '#facc15' })}${text(480, 292, '优先级 / 排队', { anchor: 'middle', weight: 900 })}
      ${rect(330, 326, 300, 36, { stroke: '#fb7185' })}${text(480, 350, '降级 / 熔断 / 恢复', { anchor: 'middle', weight: 900 })}
      ${arrow(480, 180, 480, 198)}${arrow(480, 244, 480, 262)}${arrow(480, 308, 480, 326)}
    `, '读图：流量治理是在压力下保护核心 SLA 和系统生命线。'),
    T14: () => diagramShell(topic, content, `
      ${circle(480, 222, 44, 'Trace', { fill: '#172554', stroke: '#60a5fa' })}
      ${circle(290, 276, 44, 'Logs', { fill: '#422006', stroke: '#facc15' })}
      ${circle(670, 276, 44, 'Metrics', { fill: '#064e3b', stroke: '#5eead4' })}
      ${line(324, 266, 436, 232)}${line(524, 232, 636, 266)}${line(334, 292, 626, 292)}
      ${box(380, 128, 200, 44, '统一 request_id', '串起一次慢请求', { stroke: '#38bdf8' })}
      ${arrow(480, 172, 480, 178)}
      ${box(378, 326, 204, 44, 'Dashboard + Alert', '证据驱动优化', { stroke: '#a78bfa' })}
    `, '读图：可观测性要把指标、日志和链路合成排障闭环。'),
    T15: () => diagramShell(topic, content, `
      ${['生产租户', '研发租户', '压测租户'].map((v, i) => {
        const y = 150 + i * 70;
        const w = [390, 260, 150][i];
        return `${text(90, y + 28, v, { weight: 900 })}${rect(210, y, 460, 38, { stroke: '#334155', fill: '#0f172a' })}${rect(210, y, w, 38, { stroke: ['#34d399', '#60a5fa', '#facc15'][i], fill: ['#064e3b', '#172554', '#422006'][i] })}${text(690, y + 26, ['高优先级', '弹性额度', '隔离/限速'][i], { color: '#cbd5e1' })}`;
      }).join('')}
      ${box(310, 336, 340, 38, '计量维度：QPS + tokens + 上下文 + 并发', '', { stroke: '#5eead4' })}
    `, '读图：多租户治理让共享资源可承诺、可计量、可隔离。'),
    T16: () => diagramShell(topic, content, `
      ${[['Register',480,140],['Evaluate',650,206],['Deploy',590,318],['Monitor',370,318],['Rollback',310,206]].map(([v,x,y]) => box(x - 64, y - 26, 128, 52, v, '', { stroke: '#5eead4' })).join('')}
      ${arrow(544, 154, 600, 190)}${arrow(658, 232, 616, 292)}${arrow(526, 318, 434, 318)}${arrow(370, 292, 314, 232)}${arrow(374, 190, 436, 154)}
      ${circle(480, 232, 44, 'Model', { fill: '#172554', stroke: '#60a5fa' })}
      ${text(480, 374, '模型上线是一条可回滚流水线，不是一次手工替换。', { anchor: 'middle', color: '#cbd5e1', weight: 800 })}
    `, '读图：生命周期管理把模型当作生产制品治理。'),
    T17: () => diagramShell(topic, content, `
      ${['Portal / OpenAI API', 'Gateway / Auth / Billing', 'Scheduler / Resource Pool', 'Serving Runtime / vLLM', 'Model Registry / Observability'].map((v, i) => {
        const y = 132 + i * 44;
        return `${rect(150 + i * 28, y, 660 - i * 56, 32, { stroke: ['#60a5fa', '#5eead4', '#facc15', '#38bdf8', '#a78bfa'][i] })}${text(480, y + 22, v, { anchor: 'middle', weight: 900 })}`;
      }).join('')}
      ${arrow(480, 164, 480, 176)}${arrow(480, 208, 480, 220)}${arrow(480, 252, 480, 264)}${arrow(480, 296, 480, 308)}
      ${text(480, 362, 'MaaS = API 入口 + 治理 + 调度 + 推理 runtime + 运营闭环', { anchor: 'middle', color: '#cbd5e1', weight: 800 })}
    `, '读图：MaaS 是把模型能力变成可运营服务的系统。'),
    T18: () => diagramShell(topic, content, `
      ${circle(480, 236, 42, '策略', { fill: '#064e3b', stroke: '#5eead4' })}
      ${['模型趋势', '硬件路线', '软件栈', '成本/SLA', '团队能力'].map((v, i) => {
        const angle = (-90 + i * 72) * Math.PI / 180;
        const x = 480 + Math.cos(angle) * 210;
        const y = 236 + Math.sin(angle) * 118;
        return `${line(480, 236, x, y, { color: '#475569', width: 2 })}${box(x - 72, y - 24, 144, 48, v, '', { stroke: ['#60a5fa', '#5eead4', '#facc15', '#fb7185', '#a78bfa'][i] })}`;
      }).join('')}
      ${text(480, 372, '竞争力来自硬件能力 × 软件适配速度 × 业务匹配度', { anchor: 'middle', color: '#cbd5e1', weight: 800 })}
    `, '读图：硬件代际策略要跟模型结构和平台软件一起判断。')
  };

  return (diagrams[topic.id] ?? (() => diagramShell(topic, content, '', '读图：围绕核心瓶颈理解工程动作。')))();
}

function makeSources(seed) {
  const byId = new Map(seed.topics.map((topic) => [topic.id, topic]));
  const rows = sourceRows.map(([id, focus, sources]) => `| ${id} | ${byId.get(id)?.name ?? id} | ${focus} | ${sources} |`);
  return [
    '# 内容来源与校验记录',
    '',
    '本文件记录 21 个知识点扩展正文参考过的公开资料。应用正文离线内置，不在运行时访问这些链接。',
    '',
    '内部 GTS 场景表述均作为工程化场景假设，不包装成公开事实；硬件规格和模型细节以后续官方文档、模型卡或内部实测为准。',
    '',
    '| Topic | 名称 | 校验重点 | 公开来源 |',
    '|---|---|---|---|',
    ...rows,
    ''
  ].join('\n');
}

fs.mkdirSync(DIAGRAM_DIR, { recursive: true });

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
for (const topic of seed.topics) {
  const content = topicContent[topic.id];
  if (!content) {
    throw new Error(`Missing expanded content for ${topic.id}`);
  }
  topic.body_md = topicBody(topic, content);
  fs.writeFileSync(path.join(DIAGRAM_DIR, content.slug), makeDiagram(topic, content), 'utf8');
}

fs.writeFileSync(SEED_PATH, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
fs.writeFileSync(SOURCES_PATH, makeSources(seed), 'utf8');
