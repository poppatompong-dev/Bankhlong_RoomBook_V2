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
const auditLogsRouter = require('../server/routes/auditLogs');

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
    if (req.method === 'GET') {
      return sendReadFallback(req, res, err);
    }
    next(err);
  }
}

const fallbackRooms = [
  { id: 'room-1', _id: 'room-1', name: 'ห้องมณีจันทรา ชั้น 1', capacity: 20, icon: '💎', floor: '1', location: 'อาคารสำนักงาน', isActive: true },
  { id: 'room-2', _id: 'room-2', name: 'ห้องพระพุทธสัมฤทธิ์โกสีย์ ชั้น 3', capacity: 30, icon: '🏛️', floor: '3', location: 'อาคารสำนักงาน', isActive: true },
  { id: 'room-3', _id: 'room-3', name: 'ห้องชัยบุรี กองสาธารณสุข', capacity: 20, icon: '⚔️', floor: '2', location: 'กองสาธารณสุข', isActive: true },
  { id: 'room-4', _id: 'room-4', name: 'ห้องประชุมสารสนเทศ', capacity: 10, icon: '💻', floor: '2', location: 'ศูนย์ข้อมูลข่าวสาร', isActive: true },
  { id: 'room-5', _id: 'room-5', name: 'อาคารเอนกประสงค์ (โดม)', capacity: 200, icon: '🏟️', floor: 'G', location: 'พื้นที่เอนกประสงค์', isActive: true }
];

function emptyAnalytics(req) {
  const now = new Date();
  return {
    ok: true,
    year: Number(req.query.year) || now.getFullYear(),
    month: req.query.month ? Number(req.query.month) : null,
    totalBookings: 0,
    approvedBookings: 0,
    cancelledBookings: 0,
    roomUtilization: fallbackRooms.map((room) => ({ room, bookingCount: 0, totalHours: 0 })),
    monthlyTrend: [],
    peakHours: [],
    busiestDay: 0,
    hourCounts: {},
    deptBreakdown: [],
    recentBookings: []
  };
}

function sendReadFallback(req, res, err) {
  const path = req.baseUrl || req.path;
  res.setHeader('x-bankhlong-data-source', 'fallback');
  res.setHeader('x-bankhlong-db-error', err.code || err.message || 'database_unavailable');

  if (path === '/api/rooms') {
    return res.json({ ok: true, rooms: fallbackRooms, fallback: true });
  }
  if (path === '/api/bookings') {
    if (req.path === '/analytics') return res.json(emptyAnalytics(req));
    if (req.path === '/recommendations') return res.json({ ok: true, recommendations: [], fallback: true });
    return res.json({ ok: true, bookings: [], total: 0, fallback: true });
  }
  if (path === '/api/users') {
    return res.json({
      users: [
        { _id: '000000000000000000000001', id: '000000000000000000000001', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', phone: '-', role: 'admin' },
        { _id: '000000000000000000000002', id: '000000000000000000000002', name: 'เจง ผู้ดูแลระบบ', username: 'jeng', phone: '-', role: 'admin' }
      ],
      fallback: true
    });
  }
  if (path === '/api/audit-logs') {
    return res.json({ ok: true, logs: [], total: 0, fallback: true });
  }

  return res.status(503).json({
    ok: false,
    message: 'Database unavailable',
    error: err.message
  });
}

// Keep health and hardcoded auth available even if MongoDB is unavailable.
app.get('/api/health', (req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() })
);
app.use('/api/auth', authRouter);

app.use('/api/bookings', requireDB, bookingsRouter);
app.use('/api/rooms', requireDB, roomsRouter);
app.use('/api/users', requireDB, usersRouter);
app.use('/api/audit-logs', requireDB, auditLogsRouter);

app.use((req, res) => res.status(404).json({ ok: false, message: `Not found: ${req.method} ${req.path}` }));

app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, message: err.message || 'Internal server error' });
});

module.exports = async (req, res) => app(req, res);
