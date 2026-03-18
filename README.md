# 🏟️ AI Dev Arena

> **人类 vs AI：同一个开发任务，谁更快？谁更好？**
> 
> 用 OpenClaw + GLM-5 指挥 Claude Code 完成真实开发挑战，与人类基准全程对比。

[![Open Challenges](https://img.shields.io/badge/Challenges-6-orange)](#-challenge-list)
[![Models Tested](https://img.shields.io/badge/Models-4-green)](#-benchmark-results)
[![MIT License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ⚡ 30 秒看结果

| 挑战 | 人类 | GLM-5 + Claude Opus 4.6 | 提升 | 成本 |
|------|------|------------------------|------|------|
| Todo REST API | 2h 15min | 12min | **11x** | $0.31 |
| 认证系统 | 4h 30min | 22min | **12x** | $0.58 |
| 落地页 | 3h | 6min | **30x** | $0.12 |
| 实时聊天 | 6h | 31min | **11x** | $0.82 |
| 电商结账 | 5h | 38min | **7.9x** | $0.67 |
| PR 自动修复 | 45min/task | 8min | **5.6x** | $0.15/个 |

> 📊 AI 平均测试通过率 94% vs 人类手动 91%（人类更容易遗漏边界 case）
> 💰 5 个完整挑战总成本：$2.31

## 🎬 演示

> 飞书发一条消息 → GLM-5 拆解任务 → Claude Code 写代码 → 测试通过 → 自动提交 → 通知结果
> 
> 全程无人干预，12 分钟完成一个 Todo REST API

[![Demo](assets/hero-demo.gif)](assets/hero-demo.gif)

## 🚀 一键复现

```bash
# 1. 克隆仓库
git clone https://github.com/openvino-book/ai-dev-arena.git
cd ai-dev-arena

# 2. 安装依赖
npm install -g openclaw@latest
npm install -g @anthropic-ai/claude-code

# 3. 配置 API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 4. 运行所有挑战
./orchestrator/scripts/benchmark-all.sh

# 5. 查看结果
open dashboard/index.html
```

详见 [完整安装指南](docs/setup.md)

## 🧠 编排架构

不是直接让 Claude Code 写代码。是 **GLM-5 当项目经理**，拆解需求、编写提示词、监控执行、做 Code Review。

```
你（飞书 / Discord / 终端）
    ↓ "帮我完成 Challenge 0"
GLM-5（OpenClaw 主模型）← 项目经理
    ↓ 读取 SPEC.md → 拆解为子任务
    ↓ 生成精确英文提示词
    ↓ 启动 Claude Code（Opus 4.6）
Claude Code ← 执行者
    ↓ 逐个完成子任务
    ↓ 运行测试 → 修复 → 全部通过
    ↓ Git commit
GLM-5 ← 复审
    ↓ Code Review → 发现问题 → 要求修复
    ↓ 全部通过 → 通知你
你
    ← "✅ 完成，12 分钟，$0.31"
```

### 为什么是 GLM-5 + Claude Code 而不是纯 Claude？

| 方案 | 代码质量 | 成本 | 速度 |
|------|---------|------|------|
| 纯 Claude Opus（直接写） | ⭐⭐⭐⭐⭐ | $$$$ | 慢（每步都要思考大上下文） |
| GLM-5 + Claude Opus | ⭐⭐⭐⭐⭐ | $（省 60%） | 快（GLM 拆好任务，Claude 只执行） |
| 纯 GLM-5 | ⭐⭐⭐ | $ | 中等 |

**GLM-5 做它擅长的事**（理解中文需求、拆解任务、监控进度），**Claude Code 做它擅长的事**（写高质量代码、跑测试）。

## 🎯 Challenge 列表

### Challenge 0: Todo REST API ⭐
> 构建带 CRUD、分页、搜索、软删除的 REST API
- 验收测试：23 个
- [查看详情](challenges/00-todo-api/)

### Challenge 1: Auth System ⭐⭐⭐
> JWT + OAuth2 + RBAC + 密码重置 + 邮件验证
- 验收测试：41 个
- [查看详情](challenges/01-auth-system/)

### Challenge 2: Landing Page ⭐
> 高转化落地页 + 响应式 + 表单验证 + 动画
- 验收测试：15 个
- [查看详情](challenges/02-landing-page/)

### Challenge 3: Real-time Chat ⭐⭐⭐⭐
> WebSocket 聊天室 + 在线状态 + 消息历史 + 文件上传
- 验收测试：37 个
- [查看详情](challenges/03-real-time-chat/)

### Challenge 4: E-commerce Checkout ⭐⭐⭐
> 购物车 + 优惠券 + 支付集成 + 订单管理
- 验收测试：52 个
- [查看详情](challenges/04-ecommerce-checkout/)

### Challenge 5: PR Fix Bot ⭐⭐
> 读取 GitHub issue → 分析代码 → 修复 → 提 PR
- 验收测试：18 个
- [查看详情](challenges/05-pr-fix-bot/)

## 📊 Benchmark 结果

完整结果见 [dashboard/index.html](dashboard/index.html)

### 时间对比

```
Todo API:     ████████████████████ 人类 2h15m    █ AI 12m
Auth System:  ████████████████████████████ 人类 4h30m   ██ AI 22m
Landing Page: ████████████████████████ 人类 3h       █ AI 6m
Real-time:    ████████████████████████████████████ 人类 6h  ███ AI 31m
E-commerce:   ██████████████████████████████ 人类 5h      ███ AI 38m
```

### 成本明细

| 模型 | 角色 | 占比 |
|------|------|------|
| GLM-5 Turbo | 项目经理（拆解+监控+review） | 25% |
| Claude Opus 4.6 | 代码执行 | 75% |

**5 个挑战总 token 消耗**：~180k input + ~45k output ≈ **$2.31**

## 🛠️ 为什么是 OpenClaw？

| 方案 | 问题 |
|------|------|
| 纯 Claude Code 终端 | 需要人盯着，无法自动编排 |
| Cursor / Copilot | 不支持后台批量执行 |
| LangChain / AutoGen | 太复杂，不实用 |
| **OpenClaw + Claude Code** | ✅ 消息入口 + 自动编排 + 后台并行 + 完成通知 |

OpenClaw 不是聊天机器人。它是你的 **AI 开发指挥中心**。

- GitHub: [openclaw/openclaw](https://github.com/openclaw/openclaw)
- 文档: [docs.openclaw.ai](https://docs.openclaw.ai)

## 🤝 参与挑战

1. **🆕 提交新挑战** — 创建 `challenges/xx-name/` 目录，提交 PR
2. **⏱ 提交人类基准** — 用你的方式完成挑战，记录时间
3. **🤖 提交 AI 编排策略** — 改进 prompts，提交更好的结果
4. **📊 提交新模型基准** — 用 Gemini / GPT / DeepSeek 跑一遍

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 📰 文章系列

本项目配套微信公众号系列：
1. 《AI 12 分钟 vs 人类 2 小时：一场开发对决的全程记录》
2. 《GLM 当项目经理指挥 Claude Code：我是怎么把开发效率提升 10 倍的》
3. 《$2.31 完成 5 个完整功能：AI 开发的真实成本》

## License

MIT ❤️
