# Challenge 5: PR Fix Bot

## 目标

构建一个自动化修复工具：读取模拟的 GitHub issue → 分析相关代码 → 修复 bug → 生成补丁。

## 技术栈

- **语言**: Node.js (TypeScript)
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **测试**: Jest + Supertest
- **包管理**: npm

## 功能需求

### 1. Issue 管理
- `POST /api/issues` — 创建 issue `{ title, description, severity: 'low'|'medium'|'high'|'critical', labels?: string[] }`
- `GET /api/issues` — 列表（可按 severity、status、label 筛选）
- `GET /api/issues/:id` — issue 详情
- `POST /api/issues/:id/close` — 关闭 issue

### 2. Code Snippet 存储
- `POST /api/snippets` — 上传代码片段 `{ language, filePath, content, issueId? }`
- `GET /api/snippets/:id` — 获取代码
- `GET /api/issues/:id/snippets` — 获取 issue 关联的所有代码片段

### 3. 分析接口（模拟 AI 分析）
- `POST /api/issues/:id/analyze` — 分析 issue 并生成修复方案
- 自动关联关联的代码片段
- 返回分析结果：`{ rootCause, suggestedFix, affectedFiles, confidence: number }`
- confidence 根据是否有代码片段、issue 描述详细程度计算

### 4. Fix 生成
- `POST /api/issues/:id/fix` — 基于分析生成修复补丁
- 返回：`{ patch: { filePath, originalContent, fixedContent, diff }, issueId }`
- 状态自动变为 'fix_generated'

### 5. Fix 应用
- `POST /api/issues/:id/apply-fix` — 应用修复
- 验证 patch 是否有效
- 更新代码片段内容
- 状态变为 'fix_applied'

### 6. PR 创建
- `POST /api/issues/:id/create-pr` — 创建模拟 PR
- 返回：`{ pr: { title, body, headBranch, baseBranch, files, issueId } }`
- 状态变为 'pr_created'

### 7. 完整工作流
- `POST /api/issues/:id/auto-fix` — 一键执行：分析 → 生成修复 → 应用 → 创建 PR
- 返回每步结果

### 8. 统计
- `GET /api/stats` — `{ totalIssues, open, closed, fixApplied, prCreated, avgConfidence }`

### 9. 测试辅助
- `POST /api/test-reset` — 清空所有数据

## 验收标准

运行 `npm test` 全部通过，覆盖：
1. Issue CRUD + 关闭
2. 代码片段上传 + 关联
3. 分析接口（有/无代码片段的 confidence 差异）
4. Fix 生成 + 应用
5. PR 创建
6. auto-fix 完整工作流
7. 统计接口
8. 边界：无代码片段分析、重复修复、无效状态转换
