const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function loadRoomsRouterWithPostgres(fakePostgres) {
  delete require.cache[require.resolve('../services/postgresDb')];
  delete require.cache[require.resolve('./rooms')];
  require.cache[require.resolve('../services/postgresDb')] = {
    id: require.resolve('../services/postgresDb'),
    filename: require.resolve('../services/postgresDb'),
    loaded: true,
    exports: fakePostgres
  };
  return require('./rooms');
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', router);

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

test('rooms route creates and lists rooms through postgres adapter when enabled', async () => {
  const rooms = [];
  const router = loadRoomsRouterWithPostgres({
    isEnabled: () => true,
    getRooms: async () => rooms,
    createRoom: async (room) => {
      rooms.push({ ...room, isActive: true });
      return rooms.at(-1);
    }
  });

  await withServer(router, async (baseUrl) => {
    const createResponse = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'ห้องใหม่', capacity: 18, floor: '2', icon: '🏢' })
    });
    const createBody = await createResponse.json();

    const listResponse = await fetch(`${baseUrl}/api/rooms`);
    const listBody = await listResponse.json();

    assert.equal(createResponse.status, 201);
    assert.equal(createBody.room.name, 'ห้องใหม่');
    assert.equal(listResponse.status, 200);
    assert.equal(listBody.rooms.length, 1);
    assert.equal(listBody.rooms[0].name, 'ห้องใหม่');
  });
});
