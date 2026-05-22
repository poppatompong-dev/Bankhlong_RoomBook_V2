try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
} catch (_) {
  // Vercel reads environment variables from project settings.
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter = require('../server/routes/auth');
const bookingsRouter = require('../server/routes/bookings');
const roomsRouter = require('../server/routes/rooms');
const usersRouter = require('../server/routes/users');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '5mb' }));

let dbConnection;
async function connectDB() {
  if (dbConnection && mongoose.connection.readyState === 1) return;
  dbConnection = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000
  });
}

async function requireDB(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
}

// Keep health and hardcoded auth available even if MongoDB is unavailable.
app.get('/api/health', (req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() })
);
app.use('/api/auth', authRouter);

app.use('/api/bookings', requireDB, bookingsRouter);
app.use('/api/rooms', requireDB, roomsRouter);
app.use('/api/users', requireDB, usersRouter);

app.use((req, res) => res.status(404).json({ ok: false, message: `Not found: ${req.method} ${req.path}` }));

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, message: err.message || 'Internal server error' });
});

module.exports = async (req, res) => app(req, res);
