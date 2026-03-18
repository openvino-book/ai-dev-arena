# 🏟️ AI Dev Arena

> **人类 vs AI：同一个开发任务，谁更快？谁更好？**
> 
> 用 Claude Code 完成真实开发挑战，全程自动化测试验收，可复现。

[![Challenges](https://img.shields.io/badge/Challenges-6/6-brightgreen)](#-challenge-list)
[![Tests](https://img.shields.io/badge/Tests-91%2F91-brightgreen)](#-challenge-list)
[![MIT License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## ⚡ 30 秒看结果

| # | 挑战 | 测试 | AI 耗时 | 代码量 | 文件数 |
|---|------|------|---------|--------|--------|
| 0 | Todo REST API | 22/22 ✅ | **4 min 1s** | ~300 行 TS | 1 |
| 1 | Auth System (JWT+RBAC) | 17/17 ✅ | **~3 min** | ~350 行 TS | 2 |
| 2 | Landing Page | 12/12 ✅ | **~3 min** | ~400 行 HTML/CSS/JS | 2 |
| 3 | Real-time Chat (WebSocket) | 11/11 ✅ | **~8 min** | ~300 行 TS | 1 |
| 4 | E-commerce Checkout | 17/17 ✅ | **~8 min** | ~350 行 TS | 1 |
| 5 | PR Fix Bot | 12/12 ✅ | **~5 min** | ~400 行 TS | 1 |

> 🤖 **全部 6 个挑战，91/91 测试通过，零人工干预**
> ⏱ **并行执行分两批：首批 8 分钟，次批 8 分钟**
> 💰 预估总成本：~$3.00（Claude Opus 4.6）

## 🎬 演示

> 飞书发一条消息 → GLM-5 拆解任务 → Claude Code 写代码 → 测试通过 → 自动提交 → 通知结果
> 
> 全程无人干预，4 分钟完成一个 Todo REST API

## 🚀 一键复现

```bash
# 1. 克隆仓库
git clone https://github.com/openvino-book/ai-dev-arena.git
cd ai-dev-arena

# 2. 安装 Claude Code
npm install -g @anthropic-ai/claude-code

# 3. 配置 API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 4. 运行单个挑战
cd challenges/00-todo-api
claude --permission-mode bypassPermissions --print "Read SPEC.md, implement in src/, pass all tests in acceptance-tests/"

# 5. 运行测试
cd acceptance-tests && npm install && npx jest
```

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
    ← "✅ 完成，4 分钟，62/62 测试通过"
```

### 为什么是 GLM-5 + Claude Code 而不是纯 Claude？

| 方案 | 代码质量 | 成本 | 速度 |
|------|---------|------|------|
| 纯 Claude Opus（直接写） | ⭐⭐⭐⭐⭐ | $$$$ | 慢（每步都要思考大上下文） |
| GLM-5 + Claude Opus | ⭐⭐⭐⭐⭐ | $（省 60%） | 快（GLM 拆好任务，Claude 只执行） |
| 纯 GLM-5 | ⭐⭐⭐ | $ | 中等 |

**GLM-5 做它擅长的事**（理解中文需求、拆解任务、监控进度），**Claude Code 做它擅长的事**（写高质量代码、跑测试）。

## 🎯 Challenge 列表

### ✅ Challenge 0: Todo REST API ⭐
> 构建带 CRUD、分页、搜索、软删除的 REST API
- 验收测试：22 个 | AI 结果：22/22 | 耗时：4m 1s
- [查看详情](challenges/00-todo-api/SPEC.md) | [AI 实现](challenges/00-todo-api/ai-reference/claude-opus-4-6/)

### ✅ Challenge 1: Auth System ⭐⭐⭐
> JWT + RBAC + 密码重置 + 邮件验证
- 验收测试：17 个 | AI 结果：17/17 | 耗时：~3m
- [查看详情](challenges/01-auth-system/SPEC.md) | [AI 实现](challenges/01-auth-system/ai-reference/claude-opus-4-6/)

### ✅ Challenge 2: Landing Page ⭐
> 高转化落地页 + 响应式 + 表单验证 + 动画
- 验收测试：12 个 | AI 结果：12/12 | 耗时：~3m
- [查看详情](challenges/02-landing-page/SPEC.md) | [AI 实现](challenges/02-landing-page/ai-reference/claude-opus-4-6/)

### ✅ Challenge 3: Real-time Chat ⭐⭐⭐⭐
> WebSocket 聊天室 + 在线状态 + 消息历史
- 验收测试：11 个 | AI 结果：11/11 | 耗时：~8m
- [查看详情](challenges/03-real-time-chat/SPEC.md) | [AI 实现](challenges/03-real-time-chat/ai-reference/claude-opus-4-6/)

### ✅ Challenge 4: E-commerce Checkout ⭐⭐⭐
> 购物车 + 优惠券 + 订单管理 + 库存管理
- 验收测试：17 个 | AI 结果：17/17 | 耗时：~8m
- [查看详情](challenges/04-ecommerce-checkout/SPEC.md) | [AI 实现](challenges/04-ecommerce-checkout/ai-reference/claude-opus-4-6/)

### ✅ Challenge 5: PR Fix Bot ⭐⭐
> Issue 分析 + 代码修复 + 补丁生成 + PR 创建
- 验收测试：12 个 | AI 结果：12/12 | 耗时：~5m
- [查看详情](challenges/05-pr-fix-bot/SPEC.md) | [AI 实现](challenges/05-pr-fix-bot/ai-reference/claude-opus-4-6/)

## 📊 关键发现

### 时间分布

```
纯前端 (HTML/CSS):   ████ ~3 min ← 最快
REST API (Express):  ████ ~3-8 min ← 取决于复杂度
WebSocket + REST:    ████████████ ~8 min ← 最慢
业务逻辑 (电商/修复): ██████████ ~5-8 min ← 中等
```

### 一次性通过率

| 挑战 | 首次通过 | 需要修复 |
|------|---------|---------|
| Todo API | ✅ 22/22 | 0 |
| Auth System | ✅ 17/17 | 0 |
| Landing Page | ✅ 12/12 | 0 |
| Real-time Chat | ✅ 11/11 | 0 |
| E-commerce Checkout | ✅ 17/17 | 0 |
| PR Fix Bot | ✅ 12/12 | 0 |

**Claude Opus 4.6 的一次性通过率：100%（91/91）**

### 教训

1. **纯前端最快**（无编译、无依赖），WebSocket 最慢（异步状态管理）
2. **npm install 占 30-40% 时间**，特别是在 Windows 上
3. **一次性通过率 100%** 说明 SPEC 写得越精确，AI 返回越可靠
4. **并行执行是关键**：3 个挑战串行 ~15 min，并行只要 8 min

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

## License

MIT ❤️
