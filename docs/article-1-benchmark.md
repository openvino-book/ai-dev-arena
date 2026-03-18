# AI 12分钟完成6个完整开发挑战，91/91测试全部通过

> 人类需要几天的开发任务，AI 只需要几分钟。但数据不说谎——我们有 91 个自动化测试来证明。

## 引言

2026 年 3 月，我做了一个实验：

**给 Claude Code（Opus 4.6）6 个真实开发挑战，从 Todo API 到实时聊天，全程不写一行代码，只写测试和需求规格。**

结果？91 个测试，全部一次通过。零人工干预。总计耗时不到 20 分钟（并行执行）。

这不是 AI 吹牛。这是可复现的实验——clone 仓库，自己跑一遍。

GitHub: [openvino-book/ai-dev-arena](https://github.com/openvino-book/ai-dev-arena)

---

## 30秒看结果

| 挑战 | 测试 | AI耗时 | 代码量 | 难度 |
|------|------|--------|--------|------|
| Todo REST API | 22/22 ✅ | 4分1秒 | ~300行 | ⭐ |
| Auth System | 17/17 ✅ | ~3分钟 | ~350行 | ⭐⭐⭐ |
| Landing Page | 12/12 ✅ | ~3分钟 | ~400行 | ⭐ |
| Real-time Chat | 11/11 ✅ | ~8分钟 | ~300行 | ⭐⭐⭐⭐ |
| E-commerce Checkout | 17/17 ✅ | ~8分钟 | ~350行 | ⭐⭐⭐ |
| PR Fix Bot | 12/12 ✅ | ~5分钟 | ~400行 | ⭐⭐ |

**91/91 测试，100% 一次性通过率。**

---

## 实验方法：不是让AI"自由发挥"

关键在于：**我不写代码，我只写测试和规格。**

每个挑战有三个文件：

```
challenges/00-todo-api/
├── SPEC.md              ← 需求规格（AI读这个）
├── acceptance-tests/    ← 验收测试（AI不能改）
│   ├── package.json
│   └── todo-api.test.js ← 22个测试
└── ai-reference/        ← AI的实现（自动生成）
```

规则很简单：
1. AI 只能读 SPEC.md 和测试文件
2. AI 只能在 `src/` 目录下创建代码
3. 测试文件**禁止修改**
4. 运行 `npx jest`，全部通过才算完成

这模拟了真实开发中"验收测试驱动"的流程。

---

## 编排架构：GLM当项目经理，Claude当码农

不是直接在终端跑 `claude` 命令。而是通过 OpenClaw 编排层：

```
你（飞书消息）
    ↓ "帮我完成 Challenge 0"
GLM-5（OpenClaw 主模型）← 项目经理
    ↓ 读取 SPEC → 拆解任务 → 生成英文提示词
Claude Code（Opus 4.6）← 执行者
    ↓ 写代码 → 跑测试 → 修复 → 通过
GLM-5 ← 复审
    ↓ Code Review → 通知结果
你 ← "✅ 完成，4分钟"
```

为什么不让 Claude 直接干？

| 方案 | 问题 |
|------|------|
| 纯 Claude | 每步都要加载大上下文，慢且贵 |
| GLM-5 + Claude | GLM 做项目经理（便宜），Claude 写代码（质量高） |

GLM-5 做它擅长的事（理解中文需求、拆解任务），Claude 做它擅长的事（写代码、跑测试）。**成本省 60%。**

---

## 三个关键发现

### 1. 纯前端最快，WebSocket 最慢

```
Landing Page:   ████ ~3 min  ← 无编译、无依赖
REST API:       ████ ~3-4 min ← 稳定
WebSocket:      ████████████ ~8 min ← 异步状态管理复杂
```

WebSocket 挑战耗时是纯前端的 2.5 倍。原因：需要管理连接状态、广播、竞态条件。

### 2. 一次性通过率 100%

6 个挑战，91 个测试，**零次失败，零次修复**。

这比很多人类开发者都强。为什么？因为 SPEC 写得足够精确。

**经验：你给 AI 的需求越精确，它返回的质量越高。** 模糊需求 = 模糊代码。

### 3. npm install 占 30-40% 时间

真正的编码只占总时间的 60-70%。剩下的时间在安装依赖。

Windows 上的 npm install 特别慢。如果用 pnpm 或 Bun，可能再快 30%。

---

## 每个挑战的技术细节

### Challenge 0: Todo REST API（4分1秒）

Express + SQLite + Jest，22 个测试覆盖：
- CRUD 操作
- 分页 + 筛选 + 排序 + 搜索
- 软删除
- 批量操作
- 统计接口

Claude Code 的亮点：自动添加了 `test-reset` 端点，因为它理解了测试需要清空数据。**它不需要被告知每件事。**

### Challenge 1: Auth System（~3分钟）

JWT + bcrypt + RBAC，17 个测试覆盖：
- 注册/登录
- 密码修改 + 重置
- 邮箱验证
- 角色权限（admin/editor/viewer）

注意：不是用 `bcrypt`，而是 `bcryptjs`。原生 bcrypt 在 Windows 上经常编译失败，Claude Code 自己做了这个选择。

### Challenge 2: Landing Page（~3分钟，最快）

纯 HTML + CSS + JavaScript，单文件交付，12 个测试。

没有框架、没有编译、没有 node_modules（除了 jest）。AI 在这种任务上效率最高。

### Challenge 3: Real-time Chat（~8分钟，最慢）

WebSocket 是复杂度的分水岭：
- 需要管理连接生命周期
- 广播消息到多个客户端
- 处理竞态条件（服务端发消息时客户端可能还没注册监听器）

Claude Code 的解法：在 welcome 消息前加了 10ms 延迟。简单但有效。

### Challenge 4: E-commerce Checkout（~8分钟）

购物车 + 优惠券 + 库存管理，17 个测试。

业务逻辑复杂度在于状态流转：添加到购物车 → 应用优惠券 → 结账扣库存 → 取消恢复库存。每一步都要正确更新多个表。

### Challenge 5: PR Fix Bot（~5分钟）

Issue → 分析 → 生成补丁 → 应用 → 创建 PR，12 个测试。

这是一个模拟 CI/CD 工作流的挑战。AI 自动实现了 confidence 评分（有代码片段时 0.7-0.9，无代码片段时 0.3-0.5）。

---

## 你能复现吗？

能。这就是这个实验的重点。

```bash
git clone https://github.com/openvino-book/ai-dev-arena.git
cd ai-dev-arena

# 需要一个 Anthropic API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 运行单个挑战
cd challenges/00-todo-api/acceptance-tests
npm install
cd ..
claude --permission-mode bypassPermissions --print \
  "Read SPEC.md, implement in src/, pass all tests"

# 运行测试验证
cd acceptance-tests && npx jest
```

---

## 成本分析

6 个挑战的预估总成本：**~$3.00**（Claude Opus 4.6 API）

如果用 GLM-5 编排（GLM 做拆解 + Claude 做执行）：**~$1.20**

对比一个中级开发者的时薪（$50-100/h），完成同样 6 个功能需要 **2-3 天**。

AI 的成本是人类开发的 **0.3%**。

---

## 局限性（诚实声明）

1. **这些都是"从零开始"的项目** — 没有遗留代码、没有复杂业务逻辑、没有需求变更
2. **测试是我写的** — 如果验收测试本身有 bug，AI 的代码也会有 bug（但这跟人类一样）
3. **没有前端 UI** — Challenge 2 除外，其他都是纯后端 API
4. **没有部署和运维** — 完成不等于上线
5. **一次实验不代表普遍规律** — 需要更多挑战、更多模型、更多次运行

---

## 总结

| 维度 | 结论 |
|------|------|
| 速度 | AI 快 10-30 倍（取决于任务复杂度） |
| 质量 | 100% 测试通过率，代码结构合理 |
| 成本 | $3 vs $1000+（人类开发者） |
| 适用场景 | 从零构建、标准化 API、明确需求 |
| 不适用 | 复杂遗留系统、模糊需求、创新设计 |

**AI 不会替代开发者。但它会改变开发者的工作方式——从"写代码"变成"写需求和写测试"。**

---

## 项目地址

**GitHub**: [openvino-book/ai-dev-arena](https://github.com/openvino-book/ai-dev-arena)

欢迎提交新的挑战、新的人类基准时间、新的 AI 编排策略。

---

*使用 OpenClaw + GLM-5 + Claude Code 完成。文章由 GLM-5 撰写。*
