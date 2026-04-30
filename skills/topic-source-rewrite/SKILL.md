---
name: topic-source-rewrite
description: 对 AI-Infra-Learning 仓库中的单个或多个 Topic 做“权威来源驱动”的内容改写与去幻觉修复。Use when the task asks to fix Topic factual issues, rewrite `resources/seed_data.json` fields, add/repair `sources`, update related SVG wording, and pass `verify:sources` / test / typecheck validation end-to-end.
---

# Topic Source Rewrite Skill

## Goal

按固定 SOP 修复 Topic 幻觉，不靠记忆补事实。先做 `source-snapshot`，再改 seed，再校验闭环。

## Read First

先读完整 playbook，再执行改写：

- [references/TOPIC_SOURCE_REWRITE_PLAYBOOK.md](references/TOPIC_SOURCE_REWRITE_PLAYBOOK.md)

只在以下前提满足时继续：

- `npm run typecheck` 通过
- `npm test` 通过
- `npm run verify:sources -- --no-urls` 可运行

若基线失败，先修基线，再改 Topic。

## Required Workflow (Per Topic)

对每个 `T<id>` 独立执行一遍，不并单、不跳步：

1. 收集输入  
从 `审稿结果1.md`、`审稿结果2.md`、`resources/seed_data.json`、`verify:sources` 输出收集该 Topic 的问题与现状。

2. 先写 source snapshot（硬门槛）  
在 `resources/source-snapshots/T<id>.md` 写可验证事实。每个具体数字都要有一手 URL。  
找不到一手来源时，把正文对应内容改成定性描述或标注 `[!ASSUMPTION]`。

3. 改写 seed  
仅根据 snapshot 改写 `resources/seed_data.json` 里的该 Topic：
- `name / why / key_points / real_world_connection / body_md / sources`
- `body_md` 用 `[!FACT]` / `[!ASSUMPTION]` / `[!INTERNAL]` 分层
- 新型号同步维护 `scripts/known-models.json`

4. 视情况改 SVG  
仅当正文的关键数字发生变化时，更新 `resources/topic-diagrams/t<id>-*.svg`，并保持标题/副标题与正文一致。

5. 全量校验  
按顺序执行并全部通过：

```bash
node -e "JSON.parse(require('fs').readFileSync('resources/seed_data.json','utf8'))"
npm run typecheck
npm test
npm run verify:sources -- --no-urls
npm run verify:sources -- --topic T<id>
```

## Non-Negotiable Rules

- 禁止在写完 `source-snapshot` 前改 seed 的具体数字。
- 禁止把“想让它过”的模型直接加白名单。
- 禁止放宽 Electron 安全基线、Markdown XSS 防线。
- 禁止在校验未全绿前提交。
- 禁止修改 `审稿结果1.md` 与 `审稿结果2.md`（它们是只读 backlog）。

## Output Contract

交付结果至少包含：

- `resources/source-snapshots/T<id>.md`（可追溯来源）
- `resources/seed_data.json` 对应 Topic 改写
- 必要时的 `resources/topic-diagrams/t<id>-*.svg` 同步
- 必要时的 `scripts/known-models.json` 更新
- 校验命令执行结果（通过/失败与原因）

## Execution Notes

- 优先使用一手来源（HF 模型卡、官方论文、官方 GitHub/博客）。
- 每次只处理一个 Topic 到全绿，再处理下一个 Topic。
- 遇到不确定数字，默认按 `[!ASSUMPTION]` 处理，宁保守不造事实。

---
更多细则、模板与常见坑位，始终以 [references/TOPIC_SOURCE_REWRITE_PLAYBOOK.md](references/TOPIC_SOURCE_REWRITE_PLAYBOOK.md) 为准。
