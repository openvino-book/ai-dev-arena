# Challenge 3: Real-time Chat

## 目标

构建实时聊天应用，含在线状态、消息历史、房间。

## 技术栈

- **语言**: Node.js (TypeScript)
- **框架**: Express.js + ws (WebSocket)
- **数据库**: SQLite (better-sqlite3)
- **测试**: Jest + Supertest + ws client
- **包管理**: npm

## 功能需求

### 1. HTTP API（REST）

#### 1.1 创建用户
- `POST /api/users`
- Body: `{ "username": string }` (3-20 字符, 字母数字)
- 返回 201 + `{ "id", "username", "createdAt" }`

#### 1.2 创建房间
- `POST /api/rooms`
- Body: `{ "name": string }` (1-50 字符)
- 返回 201 + `{ "id", "name", "createdAt" }`

#### 1.3 获取房间列表
- `GET /api/rooms`
- 返回 200 + 房间列表

#### 1.4 获取消息历史
- `GET /api/rooms/:roomId/messages?limit=50&before=<messageId>`
- 分页查询，默认 limit=50，max=100
- before 参数：获取该消息之前的消息
- 返回 200 + `{ "messages": Message[], "hasMore": boolean }`

### 2. WebSocket 连接

#### 2.1 连接与认证
- `ws://localhost:3001/ws?userId=<userId>`
- 连接后发送 `{ "type": "welcome", "userId", "username" }`

#### 2.2 加入房间
- 客户端发送: `{ "type": "join", "roomId": string }`
- 服务端广播: `{ "type": "user_joined", "userId", "username", "roomId" }`
- 服务端发送房间最近 20 条消息给新加入者

#### 2.3 发送消息
- 客户端发送: `{ "type": "message", "roomId": string, "content": string }`
- content: 1-1000 字符
- 服务端广播: `{ "type": "message", "id", "roomId", "userId", "username", "content", "timestamp" }`

#### 2.4 离开房间
- 客户端发送: `{ "type": "leave", "roomId": string }`
- 服务端广播: `{ "type": "user_left", "userId", "username", "roomId" }`

#### 2.5 在线状态
- 服务端每 30 秒发送 ping，客户端应答 pong
- 超时 60 秒无响应则断开
- 用户加入/离开房间时广播在线用户列表

#### 2.6 正在输入指示
- 客户端发送: `{ "type": "typing", "roomId": string }`
- 服务端广播: `{ "type": "user_typing", "userId", "username", "roomId" }`

### 3. 测试辅助
- `DELETE /api/test-reset` — 清空所有数据

## 数据模型

```typescript
interface User {
  id: string;          // UUID
  username: string;
  createdAt: string;
}

interface Room {
  id: string;          // UUID
  name: string;
  createdAt: string;
}

interface Message {
  id: string;          // UUID
  roomId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}
```

## 验收标准

运行 `npm test` 全部通过：
1. 创建用户 + 房间
2. WebSocket 连接 + welcome 消息
3. 加入房间 + 广播
4. 发送消息 + 广播 + 存储
5. 消息历史分页
6. 离开房间广播
7. 正在输入指示
8. 无效消息拒绝
9. 房间列表
10. 测试辅助端点
