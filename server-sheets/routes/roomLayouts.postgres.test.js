const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

function loadRoomLayoutsRouterWithPostgres(fakePostgres) {
  delete require.cache[require.resolve('../services/postgresDb')];
  delete require.cache[require.resolve('./roomLayouts')];
  require.cache[require.resolve('../services/postgresDb')] = {
    id: require.resolve('../services/postgresDb'),
    filename: require.resolve('../services/postgresDb'),
    loaded: true,
    exports: fakePostgres
  };
  return require('./roomLayouts');
}

async function withServer(router, fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/room-layouts', router);

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

test('room layout route creates, updates, lists, and deletes through postgres adapter', async () => {
  const layouts = [];
  const router = loadRoomLayoutsRouterWithPostgres({
    isEnabled: () => true,
    getRoomLayouts: async () => layouts,
    createRoomLayout: async (layout) => {
      layouts.push({ ...layout, _id: layout.id });
      return layouts.at(-1);
    },
    updateRoomLayout: async (id, fields) => {
      const idx = layouts.findIndex(layout => layout.id === id);
      layouts[idx] = { ...layouts[idx], ...fields };
      return layouts[idx];
    },
    deleteRoomLayout: async (id) => {
      const idx = layouts.findIndex(layout => layout.id === id);
      layouts.splice(idx, 1);
      return true;
    }
  });

  await withServer(router, async (baseUrl) => {
    const createResponse = await fetch(`${baseUrl}/api/room-layouts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'ประชุมวงกลม', icon: '⭕', sortOrder: 10 })
    });
    const createBody = await createResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/room-layouts/${createBody.layout.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'ประชุมวงกลมใหญ่', isActive: false })
    });
    const updateBody = await updateResponse.json();

    const listResponse = await fetch(`${baseUrl}/api/room-layouts?includeInactive=true`);
    const listBody = await listResponse.json();

    const deleteResponse = await fetch(`${baseUrl}/api/room-layouts/${createBody.layout.id}`, {
      method: 'DELETE'
    });

    assert.equal(createResponse.status, 201);
    assert.equal(createBody.layout.label, 'ประชุมวงกลม');
    assert.match(createBody.layout.id, /^layout_/);
    assert.equal(updateResponse.status, 200);
    assert.equal(updateBody.layout.label, 'ประชุมวงกลมใหญ่');
    assert.equal(updateBody.layout.isActive, false);
    assert.equal(listBody.layouts.length, 1);
    assert.equal(deleteResponse.status, 200);
    assert.equal(layouts.length, 0);
  });
});
