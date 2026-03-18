# Contributing to AI Dev Arena

感谢你的贡献！本仓库的目标是建立一个可信的 AI vs 人类开发基准。

## 提交新挑战

1. 复制 `challenges/00-todo-api/` 作为模板
2. 编写 `SPEC.md` — 严格、无歧义的需求规格
3. 编写验收测试 — 所有实现必须通过同样的测试
4. 提交人类基准（你自己完成 + 记录时间）
5. 提交 AI 基准（使用 orchestrator 运行）
6. 记录结果到 `results/`

## 挑战设计原则

- **SPEC 必须严格无歧义** — 人类和 AI 看同一份文档
- **验收测试必须自动化** — `npm test` 即可验证
- **难度适中** — 高级开发者 1-4 小时能完成
- **有实际意义** — 模拟真实开发任务，不是算法题

## 提交模型基准

1. 在 `orchestrator/` 中配置你的模型
2. 运行 `./orchestrator/scripts/run-challenge.sh <challenge-id>`
3. 记录结果到 `challenges/<id>/results/<model-name>/`
4. 提交 PR

## 记录人类基准

我们欢迎不同经验水平的开发者提交人类基准：

1. 不要看 AI 的实现
2. 打开计时器
3. 阅读 SPEC.md
4. 实现并通过所有验收测试
5. 记录：开始/结束时间、踩坑、总时间
6. 提交到 `challenges/<id>/human-reference/`

## 诚实原则

- 不要篡改计时数据
- 不要在 AI 基准中人工干预（除非测试卡住）
- 如果 AI 需要人工帮助，在结果中注明
