import express, { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// Initialize SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    addedAt TEXT NOT NULL,
    FOREIGN KEY (productId) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('fixed', 'percent')),
    value REAL NOT NULL,
    minPurchase REAL DEFAULT 0,
    expiresAt TEXT,
    maxUses INTEGER,
    usedCount INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cart_coupon (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    couponCode TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    shippingAddress TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    productId TEXT NOT NULL,
    productName TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id)
  );
`);

// Helper to get current timestamp
const now = () => new Date().toISOString();

// ============ PRODUCTS API ============

// Create product
app.post('/api/products', (req: Request, res: Response) => {
  const { name, price, stock = 0, category } = req.body;

  // Validation
  if (typeof price !== 'number' || price <= 0) {
    return res.status(422).json({ error: 'Price must be greater than 0' });
  }
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(422).json({ error: 'Stock must be >= 0' });
  }
  if (!name) {
    return res.status(422).json({ error: 'Name is required' });
  }

  const id = uuidv4();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO products (id, name, price, stock, category, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, name, price, stock, category || null, timestamp, timestamp);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json(product);
});

// Get products list with pagination and category filter
app.get('/api/products', (req: Request, res: Response) => {
  const { page = 1, limit = 10, category } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const products = db.prepare(query).all(...params);
  res.json({ products });
});

// Get single product
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// ============ SHOPPING CART API ============

// Add item to cart
app.post('/api/cart/items', (req: Request, res: Response) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Valid productId and quantity (>=1) required' });
  }

  // Check product exists and has stock
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Check existing cart item
  const existingItem = db.prepare('SELECT * FROM cart_items WHERE productId = ?').get(productId) as any;
  const currentQty = existingItem ? existingItem.quantity : 0;
  const newQty = currentQty + quantity;

  if (newQty > product.stock) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  if (existingItem) {
    // Update quantity
    db.prepare('UPDATE cart_items SET quantity = ? WHERE productId = ?').run(newQty, productId);
  } else {
    // Insert new item
    const id = uuidv4();
    db.prepare(`
      INSERT INTO cart_items (id, productId, quantity, addedAt)
      VALUES (?, ?, ?, ?)
    `).run(id, productId, quantity, now());
  }

  const items = db.prepare(`
    SELECT ci.id, ci.productId, ci.quantity, ci.addedAt, p.name, p.price, p.category
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all();

  res.json({ items });
});

// Get cart
app.get('/api/cart', (req: Request, res: Response) => {
  const items = db.prepare(`
    SELECT ci.id, ci.productId, ci.quantity, ci.addedAt, p.name, p.price, p.category
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all();

  res.json({ items });
});

// Update cart item quantity
app.put('/api/cart/items/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be >= 1' });
  }

  // Check product stock
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (quantity > product.stock) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }

  // Check if item exists in cart
  const existingItem = db.prepare('SELECT * FROM cart_items WHERE productId = ?').get(productId);
  if (!existingItem) {
    return res.status(404).json({ error: 'Item not in cart' });
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE productId = ?').run(quantity, productId);

  const items = db.prepare(`
    SELECT ci.id, ci.productId, ci.quantity, ci.addedAt, p.name, p.price, p.category
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all();

  res.json({ items });
});

// Remove single item from cart
app.delete('/api/cart/items/:productId', (req: Request, res: Response) => {
  const { productId } = req.params;

  db.prepare('DELETE FROM cart_items WHERE productId = ?').run(productId);

  const items = db.prepare(`
    SELECT ci.id, ci.productId, ci.quantity, ci.addedAt, p.name, p.price, p.category
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all();

  res.json({ items });
});

// Clear cart
app.delete('/api/cart', (req: Request, res: Response) => {
  db.exec('DELETE FROM cart_items');
  db.exec('DELETE FROM cart_coupon');
  res.json({ items: [] });
});

// ============ COUPONS API ============

// Create coupon
app.post('/api/coupons', (req: Request, res: Response) => {
  const { code, type, value, minPurchase, expiresAt, maxUses } = req.body;

  if (!code || !type || typeof value !== 'number') {
    return res.status(400).json({ error: 'code, type, and value are required' });
  }

  if (type !== 'fixed' && type !== 'percent') {
    return res.status(400).json({ error: 'type must be "fixed" or "percent"' });
  }

  // Check for duplicate code
  const existing = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
  if (existing) {
    return res.status(400).json({ error: 'Coupon code already exists' });
  }

  const id = uuidv4();

  db.prepare(`
    INSERT INTO coupons (id, code, type, value, minPurchase, expiresAt, maxUses, usedCount, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, code, type, value, minPurchase || 0, expiresAt || null, maxUses || null, now());

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  res.status(201).json(coupon);
});

// Apply coupon to cart
app.post('/api/cart/apply-coupon', (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code) as any;

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  // Check expiry
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'Coupon has expired' });
  }

  // Check max uses
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ error: 'Coupon has reached maximum uses' });
  }

  // Check minimum purchase
  const items = db.prepare(`
    SELECT ci.quantity, p.price
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all() as any[];

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (subtotal < coupon.minPurchase) {
    return res.status(400).json({ error: `Minimum purchase of ${coupon.minPurchase} required` });
  }

  // Apply coupon (store in cart_coupon table)
  db.exec('DELETE FROM cart_coupon');
  const id = uuidv4();
  db.prepare('INSERT INTO cart_coupon (id, code) VALUES (?, ?)').run(id, code);

  res.json({ message: 'Coupon applied', coupon: { code: coupon.code, type: coupon.type, value: coupon.value } });
});

// Remove coupon from cart
app.delete('/api/cart/coupon', (req: Request, res: Response) => {
  db.exec('DELETE FROM cart_coupon');
  res.json({ message: 'Coupon removed' });
});

// ============ ORDERS / CHECKOUT API ============

// Checkout
app.post('/api/orders/checkout', (req: Request, res: Response) => {
  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({ error: 'shippingAddress and paymentMethod are required' });
  }

  // Get cart items
  const items = db.prepare(`
    SELECT ci.productId, ci.quantity, p.name, p.price, p.stock
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
  `).all() as any[];

  if (items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Check stock for all items
  for (const item of items) {
    if (item.quantity > item.stock) {
      return res.status(400).json({ error: `Insufficient stock for ${item.name}` });
    }
  }

  // Calculate subtotal
  let subtotal = 0;
  const orderItems = items.map(item => {
    const itemSubtotal = item.price * item.quantity;
    subtotal += itemSubtotal;
    return {
      productId: item.productId,
      productName: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: itemSubtotal
    };
  });

  // Check coupon
  let discount = 0;
  let couponCode: string | null = null;
  const appliedCoupon = db.prepare('SELECT * FROM cart_coupon LIMIT 1').get() as any;

  if (appliedCoupon) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(appliedCoupon.code) as any;

    if (coupon) {
      // Validate coupon again
      const isValid = (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) &&
                      (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
                      (subtotal >= coupon.minPurchase);

      if (isValid) {
        couponCode = coupon.code;

        if (coupon.type === 'fixed') {
          discount = Math.min(coupon.value, subtotal);
        } else if (coupon.type === 'percent') {
          discount = subtotal * (coupon.value / 100);
        }

        // Increment coupon usage
        db.prepare('UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?').run(coupon.id);
      }
    }
  }

  const total = subtotal - discount;
  const orderId = uuidv4();
  const timestamp = now();

  // Create order
  db.prepare(`
    INSERT INTO orders (id, subtotal, discount, total, couponCode, status, shippingAddress, paymentMethod, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
  `).run(orderId, subtotal, discount, total, couponCode, shippingAddress, paymentMethod, timestamp, timestamp);

  // Create order items
  for (const item of orderItems) {
    const itemId = uuidv4();
    db.prepare(`
      INSERT INTO order_items (id, orderId, productId, productName, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal);

    // Deduct stock
    db.prepare('UPDATE products SET stock = stock - ?, updatedAt = ? WHERE id = ?').run(item.quantity, timestamp, item.productId);
  }

  // Clear cart
  db.exec('DELETE FROM cart_items');
  db.exec('DELETE FROM cart_coupon');

  // Return order details
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  const orderItemsResult = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(orderId);

  res.json({
    ...order,
    items: orderItemsResult
  });
});

// Get orders list
app.get('/api/orders', (req: Request, res: Response) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM orders WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const orders = db.prepare(query).all(...params);

  // Get items for each order
  const ordersWithItems = orders.map((order: any) => {
    const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);
    return { ...order, items };
  });

  res.json({ orders: ordersWithItems });
});

// Get single order
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);

  res.json({
    ...order,
    items
  });
});

// Cancel order
app.post('/api/orders/:id/cancel', (req: Request, res: Response) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status === 'cancelled') {
    return res.status(400).json({ error: 'Order already cancelled' });
  }

  if (order.status === 'delivered') {
    return res.status(400).json({ error: 'Cannot cancel delivered order' });
  }

  // Restore stock
  const items = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id) as any[];
  const timestamp = now();

  for (const item of items) {
    db.prepare('UPDATE products SET stock = stock + ?, updatedAt = ? WHERE id = ?').run(item.quantity, timestamp, item.productId);
  }

  // Update order status
  db.prepare("UPDATE orders SET status = 'cancelled', updatedAt = ? WHERE id = ?").run(timestamp, order.id);

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) as any;
  const orderItems = db.prepare('SELECT * FROM order_items WHERE orderId = ?').all(order.id);

  res.json({
    ...updatedOrder,
    items: orderItems
  });
});

// ============ TEST HELPER ============

// Reset all data
app.post('/api/test-reset', (req: Request, res: Response) => {
  db.exec('DELETE FROM order_items');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM cart_items');
  db.exec('DELETE FROM cart_coupon');
  db.exec('DELETE FROM coupons');
  db.exec('DELETE FROM products');

  res.json({ message: 'All data cleared' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for CommonJS
module.exports = { app };
