const postgresDb = require('./postgresDb');
const supabaseDb = require('./supabaseDb');

function getDatabaseMode() {
  if (process.env.MOCK_DATABASE === 'true') return 'mock';
  if (postgresDb.isEnabled()) return 'postgres';
  if (supabaseDb.isEnabled()) return 'supabase';
  if (process.env.SHEET_ID) return 'google-sheets';
  return 'unconfigured';
}

function assertConfigured() {
  const mode = getDatabaseMode();
  if (mode === 'unconfigured') {
    throw new Error('DATABASE_URL or Google Sheets configuration is missing');
  }
  return mode;
}

module.exports = { getDatabaseMode, assertConfigured };
