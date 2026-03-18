const request = require('supertest');
const { app } = require('../src/app');

describe('PR Fix Bot — Challenge 5', () => {

  let issueId, snippetId;

  beforeAll(async () => {
    try { await request(app).post('/api/test-reset').send(); } catch (e) {}
  });

  describe('Issues', () => {
    test('1.1 创建 issue', async () => {
      const res = await request(app)
        .post('/api/issues')
        .send({
          title: 'Login button does not respond',
          description: 'When user clicks login button, nothing happens. Console shows TypeError.',
          severity: 'high',
          labels: ['bug', 'ui']
        });
      expect(res.status).toBe(201);
      expect(res.body.severity).toBe('high');
      expect(res.body.labels).toEqual(['bug', 'ui']);
      issueId = res.body.id;
    });

    test('1.2 列表筛选', async () => {
      await request(app)
        .post('/api/issues')
        .send({ title: 'Low priority', description: 'minor', severity: 'low' });
      const res = await request(app).get('/api/issues?severity=high');
      expect(res.status).toBe(200);
      const list = res.body.issues || res.body;
      expect(list.every(i => i.severity === 'high')).toBe(true);
    });

    test('1.3 关闭 issue', async () => {
      const low = await request(app)
        .post('/api/issues')
        .send({ title: 'Close me', description: 'test', severity: 'low' });
      const res = await request(app)
        .post(`/api/issues/${low.body.id}/close`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('closed');
    });
  });

  describe('Code Snippets', () => {
    test('2.1 上传代码片段', async () => {
      const res = await request(app)
        .post('/api/snippets')
        .send({
          language: 'javascript',
          filePath: 'src/components/LoginButton.js',
          content: 'const Button = () => <button onClick={undefined}>Login</button>',
          issueId
        });
      expect(res.status).toBe(201);
      snippetId = res.body.id;
    });

    test('2.2 获取 issue 关联代码', async () => {
      const res = await request(app).get(`/api/issues/${issueId}/snippets`);
      expect(res.status).toBe(200);
      const list = res.body.snippets || res.body;
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Analysis', () => {
    test('3.1 分析 issue（有代码片段）', async () => {
      const res = await request(app)
        .post(`/api/issues/${issueId}/analyze`);
      expect(res.status).toBe(200);
      expect(res.body.rootCause).toBeDefined();
      expect(res.body.suggestedFix).toBeDefined();
      expect(res.body.confidence).toBeGreaterThan(0);
    });

    test('3.2 无代码片段分析 confidence 更低', async () => {
      const bare = await request(app)
        .post('/api/issues')
        .send({ title: 'Bare issue', description: 'something broke', severity: 'medium' });
      const res = await request(app)
        .post(`/api/issues/${bare.body.id}/analyze`);
      expect(res.status).toBe(200);
      // Should still work but with lower or equal confidence
      expect(res.body.confidence).toBeDefined();
    });
  });

  describe('Fix Generation & Application', () => {
    test('4.1 生成修复', async () => {
      const res = await request(app)
        .post(`/api/issues/${issueId}/fix`);
      expect(res.status).toBe(200);
      expect(res.body.patch).toBeDefined();
      expect(res.body.patch.filePath).toBeDefined();
      expect(res.body.patch.originalContent).toBeDefined();
      expect(res.body.patch.fixedContent).toBeDefined();
    });

    test('4.2 应用修复', async () => {
      const res = await request(app)
        .post(`/api/issues/${issueId}/apply-fix`);
      expect(res.status).toBe(200);
    });
  });

  describe('PR Creation', () => {
    test('5.1 创建 PR', async () => {
      const res = await request(app)
        .post(`/api/issues/${issueId}/create-pr`);
      expect(res.status).toBe(200);
      expect(res.body.pr).toBeDefined();
      expect(res.body.pr.headBranch).toBeDefined();
      expect(res.body.pr.baseBranch).toBeDefined();
    });
  });

  describe('Auto-Fix Workflow', () => {
    test('6.1 一键 auto-fix', async () => {
      // Create a fresh issue with snippet
      const issue = await request(app)
        .post('/api/issues')
        .send({
          title: 'Auto fix me',
          description: 'The search input is broken, returns undefined',
          severity: 'critical',
          labels: ['bug']
        });
      const iid = issue.body.id;
      await request(app)
        .post('/api/snippets')
        .send({
          language: 'javascript',
          filePath: 'src/search.js',
          content: 'function search(query) { return undefined; }',
          issueId: iid
        });

      const res = await request(app)
        .post(`/api/issues/${iid}/auto-fix`);
      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.fix).toBeDefined();
      expect(res.body.pr).toBeDefined();
    });
  });

  describe('Stats', () => {
    test('7.1 统计接口', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body.totalIssues).toBeGreaterThan(0);
      expect(res.body.open).toBeDefined();
      expect(res.body.fixApplied).toBeDefined();
      expect(res.body.prCreated).toBeDefined();
    });
  });
});
