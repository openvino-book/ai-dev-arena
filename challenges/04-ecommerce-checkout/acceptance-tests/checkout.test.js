const request = require('supertest');
const { app } = require('../src/app');

describe('E-commerce Checkout — Challenge 4', () => {

  let productId, couponId;
  let adminToken;

  beforeAll(async () => {
    try { await request(app).post('/api/test-reset').send(); } catch (e) {}
  });

  describe('Products', () => {
    test('1.1 创建商品', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Widget', price: 29.99, stock: 100, category: 'gadgets' });
      expect(res.status).toBe(201);
      expect(res.body.price).toBe(29.99);
      expect(res.body.stock).toBe(100);
      productId = res.body.id;
    });

    test('1.2 负价格返回 422', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Bad', price: -1, stock: 10 });
      expect(res.status).toBe(422);
    });

    test('1.3 商品列表', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      const list = res.body.products || res.body;
      expect(list.length).toBeGreaterThanOrEqual(1);
    });

    test('1.4 分类筛选', async () => {
      const res = await request(app).get('/api/products?category=gadgets');
      expect(res.status).toBe(200);
      const list = res.body.products || res.body;
      list.forEach(p => expect(p.category).toBe('gadgets'));
    });
  });

  describe('Shopping Cart', () => {
    test('2.1 添加到购物车', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .send({ productId, quantity: 3 });
      expect(res.status).toBe(200);
    });

    test('2.2 获取购物车', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(200);
      const items = res.body.items || res.body;
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items[0].quantity).toBe(3);
    });

    test('2.3 更新数量', async () => {
      const res = await request(app)
        .put(`/api/cart/items/${productId}`)
        .send({ quantity: 5 });
      expect(res.status).toBe(200);
    });

    test('2.4 移除商品', async () => {
      const res = await request(app)
        .delete(`/api/cart/items/${productId}`);
      expect(res.status).toBe(200);
      // Cart should be empty or not contain this item
      const cart = await request(app).get('/api/cart');
      const items = cart.body.items || cart.body;
      const found = items.find(i => i.productId === productId);
      expect(found).toBeUndefined();
    });
  });

  describe('Coupons', () => {
    test('3.1 创建 fixed 优惠券', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .send({ code: 'SAVE10', type: 'fixed', value: 10, minPurchase: 50 });
      expect(res.status).toBe(201);
      couponId = res.body.id;
    });

    test('3.2 创建 percent 优惠券', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .send({ code: '20OFF', type: 'percent', value: 20, maxUses: 5 });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('percent');
    });
  });

  describe('Checkout', () => {
    let orderId;

    beforeAll(async () => {
      // Create a product and add to cart
      const p = await request(app)
        .post('/api/products')
        .send({ name: 'Premium', price: 100, stock: 50, category: 'premium' });
      const pid = p.body.id;
      await request(app).post('/api/cart/items').send({ productId: pid, quantity: 2 });
      await request(app).post('/api/cart/apply-coupon').send({ code: 'SAVE10' });
    });

    test('4.1 结账成功', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .send({ shippingAddress: '123 Main St', paymentMethod: 'credit_card' });
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      orderId = res.body.id;
    });

    test('4.2 空购物车结账返回 400', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .send({ shippingAddress: '123 St', paymentMethod: 'credit_card' });
      expect(res.status).toBe(400);
    });

    test('4.3 查看订单', async () => {
      const res = await request(app).get(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
    });

    test('4.4 订单列表', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(200);
      const list = res.body.orders || res.body;
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Order Cancel', () => {
    let cancelProductId, cancelOrderId;

    beforeAll(async () => {
      // Create product with known stock
      const p = await request(app)
        .post('/api/products')
        .send({ name: 'Cancelable', price: 50, stock: 10 });
      cancelProductId = p.body.id;
      await request(app).post('/api/cart/items').send({ productId: cancelProductId, quantity: 3 });
      const order = await request(app)
        .post('/api/orders/checkout')
        .send({ shippingAddress: 'Test', paymentMethod: 'paypal' });
      cancelOrderId = order.body.id;
    });

    test('5.1 取消订单恢复库存', async () => {
      const res = await request(app)
        .post(`/api/orders/${cancelOrderId}/cancel`);
      expect(res.status).toBe(200);
      // Check stock restored
      const product = await request(app).get(`/api/products/${cancelProductId}`);
      expect(product.body.stock).toBe(10); // restored
    });
  });

  describe('Edge Cases', () => {
    test('6.1 库存不足', async () => {
      const p = await request(app)
        .post('/api/products')
        .send({ name: 'Rare', price: 999, stock: 1 });
      const pid = p.body.id;
      const res = await request(app)
        .post('/api/cart/items')
        .send({ productId: pid, quantity: 5 });
      expect(res.status).toBe(400);
    });

    test('6.2 无效优惠券', async () => {
      const p = await request(app)
        .post('/api/products')
        .send({ name: 'Test', price: 10, stock: 100 });
      await request(app).post('/api/cart/items').send({ productId: p.body.id, quantity: 1 });
      const res = await request(app)
        .post('/api/cart/apply-coupon')
        .send({ code: 'NONEXISTENT' });
      expect(res.status).toBe(404);
    });
  });
});
