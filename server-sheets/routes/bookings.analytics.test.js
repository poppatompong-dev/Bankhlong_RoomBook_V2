const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.MOCK_DATABASE = 'true';

const bookingsRouter = require('./bookings');

async function withServer(fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingsRouter);

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, () => resolve(listener));
  });

  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('analytics route returns summary data without treating analytics as a booking id', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/bookings/analytics?year=2026`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.year, 2026);
    assert.equal(body.totalBookings, 0);
    assert.ok(Array.isArray(body.roomUtilization));
    assert.ok(Array.isArray(body.monthlyTrend));
    assert.ok(Array.isArray(body.peakHours));
    assert.ok(body.hourCounts);
  });
});

test('recommendations route returns an empty recommendation list in sheets mode', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/bookings/recommendations`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(body.recommendations, []);
  });
});
