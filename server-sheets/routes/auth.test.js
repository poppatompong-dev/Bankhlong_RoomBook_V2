const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const authRouter = require('./auth');

test('login accepts the client login field for local admin users', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ login: 'jeng', password: 'jeng' })
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.username, 'jeng');
    assert.equal(body.user.role, 'admin');
    assert.ok(body.token);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
