const jwt = require('jsonwebtoken');

// Ensure the middleware reads the expected secret at require-time
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
const authMiddleware = require('../middleware/auth');

function makeResMock() {
  let statusCode = null;
  let body = null;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) { body = obj; return { statusCode, body }; },
    _get() { return { statusCode, body }; }
  };
}

describe('Auth middleware (unit)', () => {
  test('rejects missing Authorization header', async () => {
    const req = { headers: {} };
    const res = makeResMock();
    let calledNext = false;
    await authMiddleware(req, res, () => { calledNext = true; });
    const out = res._get();
    expect(out.statusCode).toBe(401);
    expect(out.body).toHaveProperty('error');
    expect(calledNext).toBe(false);
  });

  test('rejects invalid token', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.value' } };
    const res = makeResMock();
    let calledNext = false;
    await authMiddleware(req, res, () => { calledNext = true; });
    const out = res._get();
    expect(out.statusCode).toBe(401);
    expect(out.body.error).toMatch(/Invalid token/i);
    expect(calledNext).toBe(false);
  });

  test('allows valid token and sets req.workerId', async () => {
    const secret = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
    const token = jwt.sign({ id: '507f1f77bcf86cd799439011' }, secret, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeResMock();
    let calledNext = false;
    await authMiddleware(req, res, () => { calledNext = true; });
    expect(calledNext).toBe(true);
    expect(req.workerId).toBe('507f1f77bcf86cd799439011');
  });
});
