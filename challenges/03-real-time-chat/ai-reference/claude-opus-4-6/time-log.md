# Challenge 3: Real-time Chat — AI 基准结果

## 运行环境

| 项目 | 值 |
|------|-----|
| 日期 | 2026-03-19 |
| 模型 | Claude Opus 4.6 (Claude Code v2.1.76) |
| 操作系统 | Windows 11 (x64) |
| 模式 | `claude --permission-mode bypassPermissions --print` |

## 结果

| 指标 | 值 |
|------|-----|
| ✅ 测试通过 | 11/11 |
| ⏱ 总耗时 | **~8 分钟**（最慢） |
| 📝 代码行数 | ~300 行 TypeScript |
| 📄 文件数 | 1 (app.ts) |

## 实现功能

- REST API：用户创建、房间管理、消息历史（分页）
- WebSocket：连接认证、加入/离开房间、消息广播、正在输入指示
- 10ms welcome 延迟解决客户端监听器竞态条件

## 教训

- WebSocket 任务耗时是纯 REST 的 2-3 倍
- 服务端消息需要小延迟（10ms）才能确保客户端监听器已注册
- 导出 { app, server } 两个对象才能让测试控制生命周期
- 异步协议的状态管理复杂度显著高于请求-响应模型
