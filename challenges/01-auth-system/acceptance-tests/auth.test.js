const request = require('supertest');
const { app } = require('../src/app');

describe('Auth System — Challenge 1', () => {
  
  let adminToken = '';
  let viewerToken = '';
  let userId = '';
  const TEST_JWT_SECRET = 'test-secret-key-for-challenge-1';

  beforeAll(async () => {
    try { await request(app).post('/api/auth/test-reset').send(); } catch (e) {}
  });

  describe('POST /api/auth/register', () => {
    test('1.1 注册成功，返回用户信息（不含密码）', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Pass1234', name: 'Test User' });
      
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.name).toBe('Test User');
      expect(res.body.role).toBe('viewer');
      expect(res.body.emailVerified).toBe(false);
      expect(res.body.password).toBeUndefined();
      userId = res.body.id;
    });

    test('1.2 重复邮箱返回 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Pass1234', name: 'Dup' });
      
      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    test('1.3 弱密码返回 422', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak@test.com', password: 'weak', name: 'Weak' });
      
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    test('2.1 登录成功返回 JWT + 用户信息', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Pass1234' });
      
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      viewerToken = res.body.token;
    });

    test('2.2 错误密码返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Wrong1234' });
      
      expect(res.status).toBe(401);
    });

    test('2.3 不存在的用户返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'Pass1234' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    test('3.1 有效 token 返回用户信息', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    test('3.2 无 token 返回 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    test('3.3 无效 token 返回 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('4.1 正确修改密码', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ currentPassword: 'Pass1234', newPassword: 'NewPass99' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    test('4.2 错误旧密码返回 401', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ currentPassword: 'WrongOld', newPassword: 'NewPass99' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('Password Reset', () => {
    test('5.1 请求密码重置成功', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    test('5.2 不存在的邮箱也返回 200', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexist@test.com' });
      
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/auth/profile', () => {
    test('8.1 更新名称成功', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated Name' });
      
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('RBAC', () => {
    beforeAll(async () => {
      // Create admin user
      const admin = await request(app)
        .post('/api/auth/register')
        .send({ email: 'admin@test.com', password: 'Admin1234', name: 'Admin', role: 'admin' });
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin1234' });
      adminToken = login.body.token;
    });

    test('9.1 admin 可以访问 /api/admin/users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      // 密码不返回
      if (res.body.users.length > 0) {
        expect(res.body.users[0].password).toBeUndefined();
      }
    });

    test('9.2 viewer 不能访问 /api/admin/users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${viewerToken}`);
      
      expect(res.status).toBe(403);
    });

    test('9.3 editor+ 可以访问 /api/editor/content', async () => {
      const res = await request(app)
        .get('/api/editor/content')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
    });
  });
});
