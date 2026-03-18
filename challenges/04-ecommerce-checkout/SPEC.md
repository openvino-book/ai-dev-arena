# Challenge 4: E-commerce Checkout

## 目标

构建电商结账系统，含购物车、优惠券、订单管理。

## 技术栈

- **语言**: Node.js (TypeScript)
- **框架**: Express.js
- **数据库**: SQLite (better-sqlite3)
- **测试**: Jest + Supertest
- **包管理**: npm

## 功能需求

### 1. 商品管理
- `POST /api/products` — 创建商品（name, price, stock, category?）
- `GET /api/products` — 列表（分页 + category 筛选）
- `GET /api/products/:id` — 单个商品
- price 必须 > 0, stock 必须 >= 0

### 2. 购物车
- `POST /api/cart/items` — 添加到购物车 `{ productId, quantity }`
- `GET /api/cart` — 获取当前购物车（含商品详情和小计）
- `PUT /api/cart/items/:productId` — 更新数量
- `DELETE /api/cart/items/:productId` — 移除
- `DELETE /api/cart` — 清空购物车
- 添加时验证库存，quantity 必须 >= 1

### 3. 优惠券
- `POST /api/coupons` — 创建优惠券（code, type: 'fixed'|'percent', value, minPurchase?, expiresAt?, maxUses?）
- `POST /api/cart/apply-coupon` — 应用优惠券 `{ code }`
- `DELETE /api/cart/coupon` — 移除优惠券
- fixed: 直接减 N 元; percent: 减 N%（上限减到 0）
- 验证：未过期、未达使用上限、满足最低消费

### 4. 结账
- `POST /api/orders/checkout` — 创建订单
- Body: `{ shippingAddress: string, paymentMethod: string }`
- 验证：购物车非空、商品有库存、优惠券有效
- 扣减库存、标记优惠券已使用
- 返回订单详情（含商品、小计、优惠、总计）
- 清空购物车

### 5. 订单管理
- `GET /api/orders` — 订单列表（分页 + 状态筛选）
- `GET /api/orders/:id` — 订单详情
- `POST /api/orders/:id/cancel` — 取消订单（恢复库存）

### 6. 测试辅助
- `POST /api/test-reset` — 清空所有数据

## 数据模型

```typescript
interface Product { id, name, price, stock, category, createdAt, updatedAt }
interface CartItem { id, productId, quantity, addedAt }
interface Coupon { id, code, type, value, minPurchase, expiresAt, maxUses, usedCount, createdAt }
interface Order { id, items: OrderItem[], subtotal, discount, total, couponCode?, status, shippingAddress, paymentMethod, createdAt, updatedAt }
interface OrderItem { productId, productName, price, quantity, subtotal }
```

## 验收标准

运行 `npm test` 全部通过，覆盖：
1. 商品 CRUD + 库存验证
2. 购物车操作（添加/更新/删除/清空）
3. 优惠券创建/应用/验证（过期/已满/最低消费）
4. 结账流程（库存扣减/优惠券标记/订单创建）
5. 订单查询 + 取消（库存恢复）
6. 边界：库存不足、无效优惠券、空购物车结账
