const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadWithFakePool(rowsBySql) {
  const originalLoad = Module._load;
  const calls = [];

  class FakePool {
    constructor(config) {
      calls.push({ type: 'constructor', config });
    }

    async query(sql, params = []) {
      calls.push({ type: 'query', sql, params });
      const key = Object.keys(rowsBySql).find(fragment => sql.includes(fragment));
      return { rows: key ? rowsBySql[key] : [] };
    }
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'pg') return { Pool: FakePool };
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[require.resolve('./postgresDb')];
  process.env.DATABASE_URL = 'postgresql://example.invalid/neondb?sslmode=require';

  try {
    return { postgresDb: require('./postgresDb'), calls };
  } finally {
    Module._load = originalLoad;
  }
}

test('postgres adapter maps booking rows to API booking shape', async () => {
  const { postgresDb, calls } = loadWithFakePool({
    'FROM bookings': [{
      id: 'bk_1',
      name: 'Somchai',
      phone: '0812345678',
      dept: 'กองช่าง',
      room: 'ห้องประชุม',
      booking_date: '2026-06-12',
      start_time: '09:00:00',
      end_time: '10:30:00',
      purpose: 'ประชุม',
      status: 'confirmed',
      activity: 'แผนงาน',
      attendees: 12,
      equipment: { projector: true },
      additional_services: { water: true },
      metadata: { roomLayout: 'conference' },
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T01:00:00.000Z'
    }]
  });

  const bookings = await postgresDb.getAllBookings();

  assert.equal(postgresDb.isEnabled(), true);
  assert.equal(bookings[0].id, 'bk_1');
  assert.equal(bookings[0].date, '2026-06-12');
  assert.equal(bookings[0].startTime, '09:00');
  assert.equal(bookings[0].additionalServices.water, true);
  assert.equal(bookings[0].roomLayout, 'conference');
  assert.match(calls.find(call => call.type === 'constructor').config.connectionString, /^postgresql:\/\//);
});

test('postgres adapter inserts rooms with API fields mapped to database columns', async () => {
  const { postgresDb, calls } = loadWithFakePool({
    'INSERT INTO rooms': [{
      id: 'r_new',
      name: 'ห้องใหม่',
      capacity: 20,
      icon: '🏢',
      floor: '2',
      location: 'อาคาร A',
      is_active: true,
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-10T00:00:00.000Z'
    }]
  });

  const room = await postgresDb.createRoom({
    id: 'r_new',
    name: 'ห้องใหม่',
    capacity: '20',
    icon: '',
    floor: 2,
    location: 'อาคาร A'
  });

  const insert = calls.find(call => call.type === 'query' && call.sql.includes('INSERT INTO rooms'));
  assert.equal(room.id, 'r_new');
  assert.equal(room.isActive, true);
  assert.equal(insert.params[2], 20);
  assert.equal(insert.params[3], '🏢');
  assert.equal(insert.params[5], 'อาคาร A');
});
