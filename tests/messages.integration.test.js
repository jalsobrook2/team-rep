/* Integration tests for messaging endpoints using Jest + supertest + mongodb-memory-server */
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  // require the app after mongoose connection is established (server.js will not auto-connect in test env)
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Messaging integration', () => {
  let userA, userB;

  test('signup two users and exchange messages', async () => {
    // Signup User A
    const resA = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Alice Test', email: 'alice@test.local', password: 'Testpass123', skills: 'testing' })
      .expect(201);
    expect(resA.body.success).toBe(true);
    const tokenA = resA.body.data.accessToken;
    const idA = resA.body.data.worker._id;
    expect(tokenA).toBeTruthy();

    // Signup User B
    const resB = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Bob Test', email: 'bob@test.local', password: 'Testpass123', skills: 'testing' })
      .expect(201);
    expect(resB.body.success).toBe(true);
    const tokenB = resB.body.data.accessToken;
    const idB = resB.body.data.worker._id;
    expect(tokenB).toBeTruthy();

    userA = { id: idA, token: tokenA };
    userB = { id: idB, token: tokenB };

    // User A sends a message to User B
    const msgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ receiverId: userB.id, content: 'Hello Bob!' })
      .expect(201);
    expect(msgRes.body.success).toBe(true);
    expect(msgRes.body.data).toHaveProperty('_id');

    // User B should see an unread conversation with 1 unread message
    const convsB = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    expect(convsB.body.success).toBe(true);
    const convForA = convsB.body.data.find(c => c.otherId === userA.id);
    expect(convForA).toBeDefined();
    expect(convForA.unreadCount).toBeGreaterThanOrEqual(1);

    // User B fetches the conversation with A and sees the message
    const convo = await request(app)
      .get(`/api/messages/conversation/${userA.id}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    expect(convo.body.success).toBe(true);
    expect(Array.isArray(convo.body.data)).toBe(true);
    expect(convo.body.data.some(m => m.content === 'Hello Bob!')).toBe(true);

    // Mark as read
    const mark = await request(app)
      .post(`/api/messages/conversation/${userA.id}/read`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    expect(mark.body.success).toBe(true);

    // Now conversations for B should show unreadCount 0 for that conversation
    const convsBAfter = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(200);
    const convAfter = convsBAfter.body.data.find(c => c.otherId === userA.id);
    expect(convAfter).toBeDefined();
    expect(convAfter.unreadCount).toBe(0);
  });
});
