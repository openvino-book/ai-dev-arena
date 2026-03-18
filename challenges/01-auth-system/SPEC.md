# Challenge 1: Auth System

## 目标

构建完整的认证系统，含 JWT、RBAC、密码重置、邮箱验证。

## 技术栈

- **语言**: Node.js (TypeScript)
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **测试**: Jest + Supertest
- **包管理**: npm

## 功能需求

### 1. 用户注册
- `POST /api/auth/register`
- Body: `{ "email": string, "password": string, "name": string, "role?": "admin" | "editor" | "viewer" }`
- 密码规则：至少 8 位，含大小写字母和数字
- email 必须唯一
- role 默认 "viewer"
- 密码使用 bcrypt 哈希存储
- 返回 201 + `{ "id", "email", "name", "role", "emailVerified": false, "createdAt" }`（不返回密码）

### 2. 用户登录
- `POST /api/auth/login`
- Body: `{ "email": string, "password": string }`
- 返回 200 + `{ "token": string, "user": { id, email, name, role } }`
- token 为 JWT，含 userId 和 role，有效期 24h
- 返回 401 + `{ "error": "Invalid credentials" }` 如果邮箱或密码错误

### 3. 获取当前用户
- `GET /api/auth/me`
- Header: `Authorization: Bearer <token>`
- 返回 200 + 用户信息
- 返回 401 如果 token 无效或过期

### 4. 更新用户资料
- `PUT /api/auth/profile`
- Header: `Authorization: Bearer <token>`
- Body: `{ "name?": string, "email?": string }`
- 返回 200 + 更新后的用户信息
- email 更新需要重新验证

### 5. 修改密码
- `POST /api/auth/change-password`
- Header: `Authorization: Bearer <token>`
- Body: `{ "currentPassword": string, "newPassword": string }`
- 验证旧密码正确
- 新密码满足密码规则
- 返回 200 + `{ "message": "Password updated" }`

### 6. 密码重置请求
- `POST /api/auth/forgot-password`
- Body: `{ "email": string }`
- 生成 resetToken（UUID），存入数据库，有效期 1 小时
- 返回 200 + `{ "message": "Reset email sent" }`（无论邮箱是否存在）

### 7. 密码重置执行
- `POST /api/auth/reset-password`
- Body: `{ "token": string, "newPassword": string }`
- 验证 token 有效且未过期
- 更新密码
- 返回 200 或 404/422

### 8. 邮箱验证
- `POST /api/auth/verify-email`
- Body: `{ "token": string }`
- 注册时自动生成验证 token
- 验证后标记 emailVerified = true
- 返回 200 或 404

### 9. RBAC 中间件
- 提供 `requireRole(roles: string[])` 中间件
- `GET /api/admin/users` — admin only，返回所有用户列表（密码除外）
- `DELETE /api/admin/users/:id` — admin only，删除用户
- `GET /api/editor/content` — editor+ only
- 非 admin 访问 admin 路由返回 403

### 10. 测试辅助
- `POST /api/auth/test-reset` — 清空所有数据（仅测试用）

## 数据模型

```typescript
interface User {
  id: string;              // UUID
  email: string;
  password: string;        // bcrypt hash
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  emailVerified: boolean;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
  verificationToken: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## 验收标准

运行 `npm test` 必须全部通过，覆盖：
1. 注册（正常 + 重复邮箱 + 弱密码）
2. 登录（正常 + 错误密码）
3. JWT 验证（有效 token + 无效 token + 过期 token）
4. 修改密码（正常 + 错误旧密码）
5. 密码重置（请求 + 执行 + 过期 token）
6. 邮箱验证（正常 + 无效 token）
7. RBAC（admin 访问 admin 路由 + viewer 被拒）
8. 更新资料
