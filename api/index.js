try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../server-sheets/.env') });
} catch (_) {
  // Vercel reads environment variables from project settings.
}

const express = require('express');
const cors = require('cors');

const authRouter = require('../server-sheets/routes/auth');
const bookingsRouter = require('../server-sheets/routes/bookings');
const roomsRouter = require('../server-sheets/routes/rooms');
const usersRouter = require('../server-sheets/routes/users');
const sheets = require('../server-sheets/services/sheets');
const supabaseDb = require('../server-sheets/services/supabaseDb');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    res.json({
      ok: true,
      status: 'healthy',
      database: supabaseDb.isEnabled() ? 'supabase' : 'mock',
      cachedBookings: bookings.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: 'unhealthy',
      database: supabaseDb.isEnabled() ? 'supabase' : 'mock',
      error: err.message
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/users', usersRouter);

app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, message: err.message || 'Internal server error' });
});

module.exports = (req, res) => app(req, res);
