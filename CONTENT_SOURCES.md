# 内容来源与校验记录

本文件记录 21 个知识点扩展正文参考过的公开资料。应用正文离线内置，不在运行时访问这些链接。

内部 GTS 场景表述均作为工程化场景假设，不包装成公开事实；硬件规格和模型细节以后续官方文档、模型卡或内部实测为准。

| Topic | 名称 | 校验重点 | 公开来源 |
|---|---|---|---|
| T01 | Compute-bound vs Memory-bound：推理的第一性原理 | Roofline 与 memory-bound 判断 | Williams et al., Roofline model paper: https://crd.lbl.gov/assets/pubs_presos/roofline_2009.pdf; NVIDIA Memory Limited Layers guide: https://docs.nvidia.com/deeplearning/performance/dl-performance-memory-limited/index.html |
| T02 | KV Cache与显存计算 | KV Cache、MQA/GQA、长上下文显存 | GQA paper: https://arxiv.org/abs/2305.13245; Multi-Query Attention paper: https://arxiv.org/abs/1911.02150 |
| T03 | MoE vs Dense的推理差异 | MoE routing 与激活参数 | Switch Transformers: https://arxiv.org/abs/2101.03961; Mixtral model card: https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1 |
| T19 | 注意力机制演进：从MHA到线性注意力 | Attention 机制演进 | Attention Is All You Need: https://arxiv.org/abs/1706.03762; Gated Delta Networks: https://arxiv.org/abs/2412.06464 |
| T20 | Gated DeltaNet混合架构：Qwen3.5/3.6的做法 | Qwen3.5/3.6 Gated DeltaNet 混合架构 | Qwen3.5 model card: https://huggingface.co/Qwen/Qwen3.5-397B-A17B; Qwen3.5 GitHub: https://github.com/QwenLM/Qwen3.5 |
| T21 | DeepSeek V4的CSA/HCA混合注意力 | DeepSeek V4 CSA/HCA | DeepSeek V4 HF blog and technical report links: https://huggingface.co/blog/deepseekv4; DeepSeek model card commit: https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/commit/a7aaed80dd2df27620eb534454253ea25eb11c7a |
| T04 | Ascend 910B系列硬件规格与分级策略 | Ascend 硬件与容量规划 | Huawei Ascend documentation portal: https://www.hiascend.com/document; CANN documentation: https://www.hiascend.com/document/detail/zh/canncommercial |
| T05 | 昇腾NPU架构与自研算子的价值 | CANN/Ascend C 与算子优化 | Ascend C documentation: https://www.hiascend.com/document/detail/zh/canncommercial/80RC3/developmentguide/opdevg/Ascendcopdevg |
| T06 | vLLM核心机制 | vLLM PagedAttention、prefix caching、chunked prefill | vLLM PagedAttention paper: https://arxiv.org/abs/2309.06180; vLLM docs: https://docs.vllm.ai/ |
| T07 | vLLM昇腾适配与GTS定制 | vLLM Ascend 适配 | vLLM Ascend documentation: https://docs.vllm.ai/projects/ascend/en/main/ |
| T08 | Prefill/Decode分离与4P4D架构 | Disaggregated Prefill/P-D 分离 | vLLM disaggregated prefilling: https://docs.vllm.ai/usage/disagg_prefill/; vLLM Ascend disaggregated prefill: https://docs.vllm.ai/projects/ascend/en/main/developer_guide/feature_guide/disaggregated_prefill.html |
| T09 | MTP投机推理 | Speculative decoding/MTP | vLLM speculative decoding docs: https://docs.vllm.ai/en/latest/features/spec_decode.html; Speculative Sampling paper: https://arxiv.org/abs/2302.01318 |
| T10 | 量化技术与硬件分级选型 | 量化与硬件支持 | vLLM quantization docs: https://docs.vllm.ai/en/stable/features/quantization/; LLM Compressor docs: https://docs.vllm.ai/projects/llm-compressor/en/latest/ |
| T11 | 推理服务指标体系 | 推理服务指标 | vLLM production metrics: https://docs.vllm.ai/en/latest/usage/metrics.html; Prometheus metric types: https://prometheus.io/docs/concepts/metric_types/ |
| T12 | 网关架构与跨集群智能路由 | 网关路由与流量控制 | Envoy global rate limiting: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting.html; Envoy circuit breakers: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers |
| T13 | 流量治理：限流、分级与降级 | 限流、降级、熔断 | Envoy rate limiting and circuit breaker docs: https://www.envoyproxy.io/docs/envoy/latest/ |
| T14 | 可观测性体系 | 可观测性 | OpenTelemetry documentation: https://opentelemetry.io/docs/; Prometheus documentation: https://prometheus.io/docs/ |
| T15 | 多租户资源治理 | 多租户资源治理 | Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/; Kubernetes Pod QoS: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/ |
| T16 | 模型生命周期管理 | 模型生命周期 | Hugging Face Hub model cards: https://huggingface.co/docs/hub/model-cards; vLLM serving docs: https://docs.vllm.ai/ |
| T17 | MaaS平台架构全景 | MaaS 平台架构 | OpenAI-compatible serving in vLLM: https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html; OpenTelemetry docs: https://opentelemetry.io/docs/ |
| T18 | 竞争力定位与硬件代际策略 | 硬件代际策略 | DeepSeek-V3 technical report: https://arxiv.org/abs/2412.19437; vLLM hardware support docs: https://docs.vllm.ai/en/latest/models/supported_models.html |
