const test = require('node:test');
const assert = require('node:assert/strict');

function loadDatabaseMode(env) {
  const previous = {
    MOCK_DATABASE: process.env.MOCK_DATABASE,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SHEET_ID: process.env.SHEET_ID
  };

  Object.keys(previous).forEach(key => delete process.env[key]);
  Object.assign(process.env, env);
  delete require.cache[require.resolve('./databaseMode')];
  delete require.cache[require.resolve('./postgresDb')];
  delete require.cache[require.resolve('./supabaseDb')];

  const databaseMode = require('./databaseMode');

  return {
    databaseMode,
    restore() {
      Object.keys(previous).forEach(key => {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      });
      delete require.cache[require.resolve('./databaseMode')];
      delete require.cache[require.resolve('./postgresDb')];
      delete require.cache[require.resolve('./supabaseDb')];
    }
  };
}

test('database mode prefers postgres when DATABASE_URL is configured', () => {
  const { databaseMode, restore } = loadDatabaseMode({
    MOCK_DATABASE: 'false',
    DATABASE_URL: 'postgresql://example.invalid/neondb?sslmode=require',
    SHEET_ID: 'legacy-sheet'
  });

  try {
    assert.equal(databaseMode.getDatabaseMode(), 'postgres');
    assert.equal(databaseMode.assertConfigured(), 'postgres');
  } finally {
    restore();
  }
});

test('database mode reports a clear configuration error when no database is configured', () => {
  const { databaseMode, restore } = loadDatabaseMode({ MOCK_DATABASE: 'false' });

  try {
    assert.equal(databaseMode.getDatabaseMode(), 'unconfigured');
    assert.throws(
      () => databaseMode.assertConfigured(),
      /DATABASE_URL or Google Sheets configuration is missing/
    );
  } finally {
    restore();
  }
});
