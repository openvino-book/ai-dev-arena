const request = require('supertest');
const WebSocket = require('ws');
const { app, server } = require('../src/app');

describe('Real-time Chat — Challenge 3', () => {

  const WS_PORT = 3002;
  let wsUrl = `ws://localhost:${WS_PORT}/ws`;

  beforeAll(async () => {
    try { await request(app).delete('/api/test-reset').send(); } catch (e) {}
    // Wait for server to be ready
    await new Promise(r => setTimeout(r, 1000));
  });

  afterAll((done) => {
    if (server && server.close) {
      server.close(done);
    } else {
      done();
    }
  });

  // Helper: create WebSocket connection
  function createWS(userId, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { ws.terminate(); reject(new Error('WS timeout')); }, timeout);
      const ws = new WebSocket(`${wsUrl}?userId=${userId}`);
      ws.on('open', () => { clearTimeout(timer); resolve(ws); });
      ws.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }

  // Helper: wait for message
  function waitForMessage(ws, type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === type) {
          clearTimeout(timer);
          ws.removeListener('message', handler);
          resolve(msg);
        }
      };
      ws.on('message', handler);
    });
  }

  describe('HTTP API', () => {
    test('1.1 创建用户', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'alice' });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe('alice');
      expect(res.body.id).toBeDefined();
    });

    test('1.2 创建房间', async () => {
      const res = await request(app)
        .post('/api/rooms')
        .send({ name: 'general' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('general');
      expect(res.body.id).toBeDefined();
    });

    test('1.3 获取房间列表', async () => {
      const res = await request(app).get('/api/rooms');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rooms || res.body)).toBe(true);
      const rooms = res.body.rooms || res.body;
      expect(rooms.length).toBeGreaterThanOrEqual(1);
    });

    test('1.4 用户名太短返回 422', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'ab' });
      expect(res.status).toBe(422);
    });

    test('1.5 用户名太长返回 422', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'a'.repeat(21) });
      expect(res.status).toBe(422);
    });
  });

  describe('WebSocket', () => {
    let user1Id = '';
    let roomId = '';
    let ws1, ws2;

    beforeAll(async () => {
      // Create two users and a room
      const u1 = await request(app).post('/api/users').send({ username: 'wsuser1' });
      user1Id = u1.body.id;
      await request(app).post('/api/users').send({ username: 'wsuser2' });
      const room = await request(app).post('/api/rooms').send({ name: 'wsroom' });
      roomId = room.body.id;
    });

    afterAll(() => {
      if (ws1 && ws1.readyState === WebSocket.OPEN) ws1.terminate();
      if (ws2 && ws2.readyState === WebSocket.OPEN) ws2.terminate();
    });

    test('2.1 连接并收到 welcome', async () => {
      ws1 = await createWS(user1Id);
      const msg = await waitForMessage(ws1, 'welcome');
      expect(msg.userId).toBe(user1Id);
      expect(msg.username).toBe('wsuser1');
    });

    test('2.2 加入房间并广播', async () => {
      ws2 = await createWS('dummy-ws-id-2');
      await waitForMessage(ws2, 'welcome');

      // ws2 joins
      ws2.send(JSON.stringify({ type: 'join', roomId }));
      const joined = await waitForMessage(ws2, 'user_joined');
      expect(joined.roomId).toBe(roomId);
    });

    test('2.3 发送消息并广播', async () => {
      ws1.send(JSON.stringify({ type: 'join', roomId }));
      await waitForMessage(ws1, 'user_joined');

      ws1.send(JSON.stringify({ type: 'message', roomId, content: 'Hello World' }));
      const msg = await waitForMessage(ws1, 'message', 8000);
      expect(msg.content).toBe('Hello World');
      expect(msg.roomId).toBe(roomId);
      expect(msg.username).toBe('wsuser1');
      expect(msg.id).toBeDefined();
    });

    test('2.4 消息历史', async () => {
      const res = await request(app)
        .get(`/api/rooms/${roomId}/messages`);
      expect(res.status).toBe(200);
      const messages = res.body.messages || res.body;
      expect(Array.isArray(messages)).toBe(true);
      // Should have at least the message we sent
      const hasOurMsg = messages.some(m => m.content === 'Hello World');
      expect(hasOurMsg).toBe(true);
    });

    test('2.5 正在输入指示', async () => {
      ws1.send(JSON.stringify({ type: 'typing', roomId }));
      const typing = await waitForMessage(ws1, 'user_typing');
      expect(typing.roomId).toBe(roomId);
    });
  });

  describe('Test Helpers', () => {
    test('10.1 test-reset 清空数据', async () => {
      const res = await request(app).delete('/api/test-reset').send();
      expect(res.status).toBe(200);
      // Verify empty
      const rooms = await request(app).get('/api/rooms');
      const list = rooms.body.rooms || rooms.body;
      expect(list.length).toBe(0);
    });
  });
});
