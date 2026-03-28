/**
 * Vercel Serverless Function — ชี้ไปยัง server (MongoDB + Express)
 */
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
} catch (_) { /* Vercel: env vars come from Dashboard settings */ }


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter     = require('../server/routes/auth');
const bookingsRouter = require('../server/routes/bookings');
const roomsRouter    = require('../server/routes/rooms');
const usersRouter    = require('../server/routes/users');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/rooms',    roomsRouter);
app.use('/api/users',    usersRouter);

// Health
app.get('/api/health', (req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() })
);

// 404
app.use((req, res) => res.status(404).json({ ok: false, message: `Not found: ${req.method} ${req.path}` }));

// Error
app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, message: err.message || 'Internal server error' });
});

// ─── MongoDB connection (singleton) ──────────────────────────────────────────
let _db;
async function connectDB() {
  if (_db && mongoose.connection.readyState === 1) return;
  _db = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  });
}

module.exports = async (req, res) => {
  await connectDB();
  return app(req, res);
};
