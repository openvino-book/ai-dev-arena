/**
 * Challenge 0: Todo REST API — 验收测试
 * 
 * 共 23 个测试用例，覆盖所有功能需求。
 * AI 和人类完成挑战时，必须通过全部测试。
 */

const request = require('supertest');
// 被测应用会在此路径实现
const { app } = require('../src/app');

describe('Todo REST API — Challenge 0', () => {
  
  // 清理数据库
  beforeEach(async () => {
    // 通过内部 API 重置（或直接清数据库）
    try {
      await request(app).delete('/api/todos/test-reset');
    } catch (e) {
      // 如果没有 reset 端点，忽略
    }
  });

  // ============================================
  // 1. 创建 Todo (4 tests)
  // ============================================
  describe('POST /api/todos', () => {
    
    test('1.1 创建 todo 成功，返回 201 和完整对象', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({
          title: '学习 TypeScript',
          description: '完成 TS 基础教程',
          priority: 'high',
          dueDate: '2027-01-01T00:00:00Z'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('学习 TypeScript');
      expect(res.body.description).toBe('完成 TS 基础教程');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('active');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.deletedAt).toBeNull();
    });

    test('1.2 title 必填，缺少时返回 422', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({ priority: 'medium' });
      
      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
    });

    test('1.3 默认 priority 为 medium', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({ title: '默认测试' });
      
      expect(res.status).toBe(201);
      expect(res.body.priority).toBe('medium');
    });

    test('1.4 title 超过 200 字符返回 422', async () => {
      const res = await request(app)
        .post('/api/todos')
        .send({ title: 'a'.repeat(201) });
      
      expect(res.status).toBe(422);
    });
  });

  // ============================================
  // 2. 获取单个 Todo (2 tests)
  // ============================================
  describe('GET /api/todos/:id', () => {
    
    test('2.1 获取存在的 todo', async () => {
      const created = await request(app)
        .post('/api/todos')
        .send({ title: '查找测试' });
      
      const res = await request(app).get(`/api/todos/${created.body.id}`);
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.title).toBe('查找测试');
    });

    test('2.2 不存在的 todo 返回 404', async () => {
      const res = await request(app).get('/api/todos/nonexistent-id');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ============================================
  // 3. 列表、分页、筛选、排序、搜索 (5 tests)
  // ============================================
  describe('GET /api/todos', () => {
    
    test('3.1 默认分页正常返回', async () => {
      // 创建 3 个 todo
      for (let i = 0; i < 3; i++) {
        await request(app).post('/api/todos').send({ title: `Todo ${i}` });
      }
      
      const res = await request(app).get('/api/todos');
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBeDefined();
      expect(res.body.totalPages).toBeDefined();
    });

    test('3.2 按 status 筛选', async () => {
      await request(app).post('/api/todos').send({ title: '活跃的' });
      const created = await request(app).post('/api/todos').send({ title: '完成的' });
      await request(app).put(`/api/todos/${created.body.id}`).send({ status: 'completed' });
      
      const resActive = await request(app).get('/api/todos?status=active');
      const resCompleted = await request(app).get('/api/todos?status=completed');
      
      expect(resActive.body.data.length).toBe(1);
      expect(resActive.body.data[0].title).toBe('活跃的');
      expect(resCompleted.body.data.length).toBe(1);
      expect(resCompleted.body.data[0].title).toBe('完成的');
    });

    test('3.3 按 sortBy 和 sortOrder 排序', async () => {
      await request(app).post('/api/todos').send({ title: 'Low', priority: 'low' });
      await request(app).post('/api/todos').send({ title: 'High', priority: 'high' });
      await request(app).post('/api/todos').send({ title: 'Medium', priority: 'medium' });
      
      const resAsc = await request(app).get('/api/todos?sortBy=priority&sortOrder=asc');
      const resDesc = await request(app).get('/api/todos?sortBy=priority&sortOrder=desc');
      
      expect(resAsc.body.data[0].priority).toBe('high');
      expect(resDesc.body.data[0].priority).toBe('low');
    });

    test('3.4 搜索模糊匹配 title', async () => {
      await request(app).post('/api/todos').send({ title: '买菜回家做饭' });
      await request(app).post('/api/todos').send({ title: '写代码调试bug' });
      
      const res = await request(app).get('/api/todos?search=买菜');
      
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('买菜回家做饭');
    });

    test('3.5 分页 limit 限制', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/todos').send({ title: `Page ${i}` });
      }
      
      const res = await request(app).get('/api/todos?page=1&limit=2');
      
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.total).toBe(5);
      expect(res.body.totalPages).toBe(3); // ceil(5/2) = 3
    });
  });

  // ============================================
  // 4. 更新 Todo (3 tests)
  // ============================================
  describe('PUT /api/todos/:id', () => {
    
    test('4.1 更新 title 和 priority', async () => {
      const created = await request(app)
        .post('/api/todos')
        .send({ title: '原始标题', priority: 'low' });
      
      const res = await request(app)
        .put(`/api/todos/${created.body.id}`)
        .send({ title: '新标题', priority: 'high' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('新标题');
      expect(res.body.priority).toBe('high');
      // updatedAt 应该变化
      expect(res.body.updatedAt).not.toBe(created.body.updatedAt);
    });

    test('4.2 标记 completed 自动设置 completedAt', async () => {
      const created = await request(app)
        .post('/api/todos')
        .send({ title: '完成测试' });
      
      expect(created.body.completedAt).toBeNull();
      
      const res = await request(app)
        .put(`/api/todos/${created.body.id}`)
        .send({ status: 'completed' });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).not.toBeNull();
    });

    test('4.3 更新不存在的 todo 返回 404', async () => {
      const res = await request(app)
        .put('/api/todos/nonexistent')
        .send({ title: '不存在' });
      
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // 5. 软删除 (3 tests)
  // ============================================
  describe('DELETE /api/todos/:id', () => {
    
    test('5.1 软删除成功', async () => {
      const created = await request(app)
        .post('/api/todos')
        .send({ title: '待删除' });
      
      const res = await request(app)
        .delete(`/api/todos/${created.body.id}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    test('5.2 软删除后不出现在列表中', async () => {
      const created = await request(app)
        .post('/api/todos')
        .send({ title: '会消失' });
      
      await request(app).delete(`/api/todos/${created.body.id}`);
      
      const res = await request(app).get('/api/todos');
      
      expect(res.body.data.length).toBe(0);
    });

    test('5.3 删除不存在的 todo 返回 404', async () => {
      const res = await request(app).delete('/api/todos/nonexistent');
      
      expect(res.status).toBe(404);
    });
  });

  // ============================================
  // 6. 批量操作 (3 tests)
  // ============================================
  describe('POST /api/todos/batch', () => {
    
    test('6.1 批量完成', async () => {
      const ids = [];
      for (let i = 0; i < 3; i++) {
        const res = await request(app).post('/api/todos').send({ title: `Batch ${i}` });
        ids.push(res.body.id);
      }
      
      const res = await request(app)
        .post('/api/todos/batch')
        .send({ action: 'complete', ids });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(3);
      expect(res.body.failed).toBe(0);
    });

    test('6.2 批量操作混合成功和失败', async () => {
      const res1 = await request(app).post('/api/todos').send({ title: '有效' });
      
      const res = await request(app)
        .post('/api/todos/batch')
        .send({ action: 'complete', ids: [res1.body.id, 'invalid-id'] });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(1);
      expect(res.body.failed).toBe(1);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBe(1);
    });

    test('6.3 批量删除', async () => {
      const ids = [];
      for (let i = 0; i < 2; i++) {
        const res = await request(app).post('/api/todos').send({ title: `Del ${i}` });
        ids.push(res.body.id);
      }
      
      const res = await request(app)
        .post('/api/todos/batch')
        .send({ action: 'delete', ids });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(2);
    });
  });

  // ============================================
  // 7. 统计 (2 tests)
  // ============================================
  describe('GET /api/todos/stats', () => {
    
    test('7.1 统计正确', async () => {
      // 创建不同优先级和状态的 todo
      await request(app).post('/api/todos').send({ title: 'T1', priority: 'high' });
      await request(app).post('/api/todos').send({ title: 'T2', priority: 'low' });
      const t3 = await request(app).post('/api/todos').send({ title: 'T3', priority: 'medium' });
      await request(app).put(`/api/todos/${t3.body.id}`).send({ status: 'completed' });
      
      const res = await request(app).get('/api/todos/stats');
      
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.active).toBe(2);
      expect(res.body.completed).toBe(1);
      expect(res.body.byPriority.high).toBe(1);
      expect(res.body.byPriority.low).toBe(1);
      expect(res.body.byPriority.medium).toBe(1);
    });

    test('7.2 空数据统计', async () => {
      const res = await request(app).get('/api/todos/stats');
      
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.active).toBe(0);
      expect(res.body.completed).toBe(0);
    });
  });
});
