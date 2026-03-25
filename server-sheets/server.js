require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sheets = require('./services/sheets');
const bookingsRouter = require('./routes/bookings');
const roomsRouter = require('./routes/rooms');
const authRouter = require('./routes/auth');

const app = express();
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 60,
  message: { ok: false, message: 'คำขอมากเกินไป กรุณารอสักครู่' }
});

const createBookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { ok: false, message: 'สร้างการจองมากเกินไป' }
});

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/', apiLimiter);

// Stricter for create/cancel
app.use('/api/bookings', (req, res, next) => {
  if (req.method === 'POST') {
    return createBookingLimiter(req, res, next);
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/rooms', roomsRouter);

// Health check
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

// Cache status
app.get('/api/cache', (req, res) => {
  const sheetsModule = require('./services/sheets');
  res.json({ ok: true, message: 'Use /api/health to see cached booking count' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ ok: false, message: 'Internal server error', error: err.message });
});

// ─── Startup ──────────────────────────────────────────────────────────────
async function start() {
  const PORT = process.env.PORT || 5001;

  try {
    // Ensure sheet has header row
    await sheets.ensureHeaders();
    console.log('✅ Google Sheets connection verified');

    // Pre-warm cache
    await sheets.getAllBookings(true);

    // Background cache refresh every 7 seconds
    setInterval(async () => {
      try {
        await sheets.getAllBookings(true);
      } catch (err) {
        console.error('⚠️ Cache refresh failed:', err.message);
      }
    }, 7000);

    app.listen(PORT, () => {
      console.log(`\n🚀 Sheets Backend ready!`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`📊 Sheet: https://docs.google.com/spreadsheets/d/${process.env.SHEET_ID}`);
      console.log(`🔄 Cache refresh: every 7 seconds\n`);
    });
  } catch (err) {
    console.error('\n❌ Startup failed:', err.message);
    console.error('\n💡 Check your .env and service-account.json setup\n');
    process.exit(1);
  }
}

start();
