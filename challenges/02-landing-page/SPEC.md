# Challenge 2: Landing Page

## 目标

构建一个高转化落地页，响应式设计，含表单验证和动画。

## 技术栈

- **纯 HTML + CSS + JavaScript**（无框架）
- **测试**: Jest + jsdom

## 功能需求

### 1. Hero Section
- 大标题 + 副标题 + CTA 按钮
- 响应式（桌面 ≥ 1024px / 平板 ≥ 768px / 手机 < 768px）
- 手机端标题字号 ≤ 2rem，桌面端 ≥ 3rem

### 2. Features Section
- 至少 3 个 feature 卡片
- 卡片有图标（用 emoji 或 SVG）、标题、描述
- 悬停动画（scale 或 shadow 变化）

### 3. Newsletter 注册表单
- 邮箱输入框 + 提交按钮
- 前端验证：有效邮箱格式
- 提交后显示成功消息（不实际发送）
- 验证失败显示错误消息

### 4. Testimonials Section
- 至少 2 条用户评价
- 包含姓名、角色、评价内容

### 5. Footer
- 版权信息（含当前年份）
- 至少 2 个链接

### 6. 动画
- 使用 CSS transition/animation（不用 JS 动画库）
- 页面加载时 hero section 有淡入动画
- CTA 按钮有 hover 效果

### 7. 可访问性
- 语义化 HTML（header, main, section, footer）
- 图片有 alt 文本
- 表单有 label 关联

## 交付物

- `index.html` — 单文件（内联 CSS 和 JS）
- 部署后浏览器打开即可看到完整页面

## 验收标准

运行 `npm test` 通过所有测试（基于 jsdom DOM 检查）：
1. 页面包含 hero section（h1 + p + button）
2. 页面包含至少 3 个 feature 卡片
3. Newsletter 表单存在（input[type=email] + button）
4. 无效邮箱提交显示错误消息
5. 有效邮箱提交显示成功消息
6. 包含至少 2 条 testimonials
7. 包含 footer（copyright + 链接）
8. 响应式 meta viewport 标签存在
9. 语义化 HTML 元素存在
