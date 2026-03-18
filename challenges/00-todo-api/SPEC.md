# Challenge 0: Todo REST API

## 目标

构建一个完整的 Todo REST API，包含 CRUD、分页、搜索、软删除等功能。

## 技术栈要求

- **语言**: Node.js (TypeScript)
- **框架**: Express.js
- **数据库**: SQLite（使用 better-sqlite3）
- **测试**: Jest + Supertest
- **包管理**: npm

## 功能需求

### 1. 创建 Todo
- `POST /api/todos`
- Body: `{ "title": string, "description?: string, "priority": "low" | "medium" | "high", "dueDate?: string (ISO 8601) }`
- 返回 201 + 创建的 todo（含 id, createdAt, updatedAt）
- title 必填，1-200 字符
- priority 默认 "medium"
- dueDate 如果提供必须是有效日期且不早于当前时间

### 2. 获取单个 Todo
- `GET /api/todos/:id`
- 返回 200 + todo 详情
- 不存在返回 404

### 3. 获取 Todo 列表（带分页和筛选）
- `GET /api/todos?page=1&limit=20&status=all|active|completed&priority=low|medium|high&sortBy=createdAt|dueDate|priority&sortOrder=asc|desc&search=keyword`
- 分页默认 page=1, limit=20，max limit=100
- status 筛选：all（默认）、active（未完成）、completed（已完成）
- priority 筛选：可选，支持单个值
- sortBy：createdAt（默认）、dueDate、priority
- sortOrder：desc（默认）、asc
- search：模糊匹配 title 和 description
- 返回 `{ "data": Todo[], "total": number, "page": number, "limit": number, "totalPages": number }`

### 4. 更新 Todo
- `PUT /api/todos/:id`
- Body: `{ "title?: string, "description?: string, "priority?: ..., "dueDate?: ..., "status?: "active" | "completed" }`
- 返回 200 + 更新后的 todo
- updatedAt 自动更新
- 不存在返回 404
- 标记为 completed 时自动设置 completedAt

### 5. 软删除 Todo
- `DELETE /api/todos/:id`
- 返回 200 + `{ "message": "Todo deleted" }`
- 标记 deletedAt，不实际删除
- 已删除的 todo 不出现在列表中（除非显式查询）
- 不存在返回 404

### 6. 批量操作
- `POST /api/todos/batch`
  - Body: `{ "action": "complete" | "delete", "ids": string[] }`
  - 批量标记完成或批量删除
  - 返回 `{ "success": number, "failed": number, "errors": Array<{id, reason}> }`
- `DELETE /api/todos` (query: `?status=completed`)
  - 清理所有已完成的 todo
  - 返回 `{ "deleted": number }`

### 7. 统计
- `GET /api/todos/stats`
- 返回 `{ "total": number, "active": number, "completed": number, "byPriority": { "low": number, "medium": number, "high": number } }`

## 数据模型

```typescript
interface Todo {
  id: string;          // UUID v4
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

## 数据库

- 使用 SQLite + better-sqlite3
- 数据库文件: `./data/todos.db`
- 自动创建表（应用启动时）
- 确保使用事务保证批量操作的原子性

## 错误处理

- 所有错误返回 `{ "error": string, "details?: any }`
- 使用适当的 HTTP 状态码（400, 404, 422, 500）
- 输入验证失败返回 422 + 详细错误信息

## 代码质量

- TypeScript strict mode
- ESLint 配置
- 合理的代码组织和错误处理
- 所有 async 操作使用 try-catch

## 验收标准

运行 `npm test` 必须全部通过（23 个测试用例），覆盖：
1. 创建 todo（正常 + 边界）
2. 获取单个（正常 + 不存在）
3. 列表分页（正常 + 筛选 + 排序 + 搜索）
4. 更新（正常 + 部分更新 + 不存在）
5. 软删除（正常 + 不出现在列表 + 不存在）
6. 批量操作（批量完成 + 批量删除 + 混合成功失败）
7. 统计（正常 + 空数据）
