# Challenge 1: Auth System — AI 基准结果

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
| ✅ 测试通过 | 17/17 |
| ⏱ 总耗时 | **~3 分钟** |
| 📝 代码行数 | ~350 行 TypeScript |
| 📄 文件数 | 2 (app.ts + database.ts) |

## 实现功能

1. 用户注册（bcrypt 哈希 + 邮箱唯一）
2. JWT 登录（24h 过期）
3. 获取当前用户
4. 修改密码
5. 密码重置（请求 + 执行 + 过期验证）
6. 邮箱验证
7. RBAC 中间件（admin/editor/viewer）
8. Admin 路由（用户列表 + 删除用户）

## 教训

- bcryptjs 比 bcrypt 在 Windows 上更稳定
- JWT secret 需要硬编码给测试环境
- RBAC 中间件设计简洁，requireRole(roles) 模式可复用
