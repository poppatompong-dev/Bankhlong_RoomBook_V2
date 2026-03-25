/**
 * Vercel Serverless Function entry point.
 * Re-exports the Express app from server-sheets.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../server-sheets/.env') });
const express = require('express');
const cors = require('cors');
const sheets = require('../server-sheets/services/sheets');
const bookingsRouter = require('../server-sheets/routes/bookings');
const roomsRouter = require('../server-sheets/routes/rooms');
const authRouter = require('../server-sheets/routes/auth');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/rooms', roomsRouter);

// Health
app.get('/api/health', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    res.json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      cachedBookings: bookings.length,
      sheet: process.env.SHEET_ID,
      sheetName: process.env.SHEET_NAME
    });
  } catch (err) {
    res.status(500).json({ ok: false, status: 'unhealthy', error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ ok: false, message: 'Internal server error' });
});

// Ensure headers on cold start
let _init;
async function ensureInit() {
  if (!_init) {
    _init = sheets.ensureHeaders().catch(e => { _init = null; throw e; });
  }
  return _init;
}

module.exports = async (req, res) => {
  await ensureInit();
  return app(req, res);
};
