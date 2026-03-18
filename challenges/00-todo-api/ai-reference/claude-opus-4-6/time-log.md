# Challenge 0: Todo REST API — AI 基准结果

## 运行环境

| 项目 | 值 |
|------|-----|
| 日期 | 2026-03-19 |
| 模型 | Claude Opus 4.6 (Claude Code v2.1.76) |
| 编排 | 直接 CLI（无 OpenClaw 编排层） |
| 操作系统 | Windows 11 (x64) |
| Node.js | v24.12.0 |
| 模式 | `claude --permission-mode bypassPermissions --print` |

## 结果

| 指标 | 值 |
|------|-----|
| ✅ 测试通过 | 22/22 |
| ⏱ 总耗时 | **4 分 1 秒** (241 秒) |
| 📝 代码行数 | ~300 行 TypeScript |
| 📄 文件数 | 1 (src/app.ts) |
| 💰 预估 token | ~50k input + ~10k output |

## 时间分解

1. **Claude Code 初始化 + npm install**: ~90 秒
2. **阅读 SPEC + 实现代码**: ~100 秒
3. **运行测试 + 修复**: ~51 秒

## 观察

- Claude Code 一次性通过了全部 22 个测试，没有需要修复的失败用例
- 代码质量高：有完整的类型定义、输入验证、事务支持
- 额外实现了 `DELETE /api/todos/test-reset` 用于测试数据清理
- 实现了 SPEC 中所有要求的功能点

## 教训

1. **beforeEach 中的 test-reset**：测试需要一个清空数据库的端点。Claude Code 自己加了这个端点，说明它能理解测试需求
2. **路由顺序很重要**：stats 和 batch 端点放在 `/:id` 前面，避免路由冲突。Claude Code 正确处理了这点
3. **直接 CLI vs OpenClaw 编排**：这次是纯 Claude Code，没有通过 OpenClaw 编排层。下次应该测试 OpenClaw + GLM-5 编排模式的对比
