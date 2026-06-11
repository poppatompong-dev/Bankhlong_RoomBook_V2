/**
 * Minimal auth routes for the React client.
 * Uses configured database users first, then local env fallback admins.
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const postgresDb = require('../services/postgresDb');
const supabaseDb = require('../services/supabaseDb');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const USERS = [
  {
    id: 'u1',
    name: 'ผู้ดูแลระบบ',
    username: ADMIN_USERNAME.toLowerCase(),
    email: `${ADMIN_USERNAME.toLowerCase()}@meeting.local`,
    password: ADMIN_PASSWORD,
    role: 'admin'
  },
  {
    id: 'u2',
    name: 'เจง ผู้ดูแลระบบ',
    username: 'jeng',
    email: 'jeng@meeting.local',
    password: 'jeng',
    role: 'admin'
  }
];

function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    exp: Date.now() + 86400000
  })).toString('base64');
  const sig = crypto
    .createHmac('sha256', process.env.TOKEN_SECRET || 'sheets-secret')
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  try {
    const [payload] = token.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

module.exports.verifyToken = verifyToken;

async function passwordMatches(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash === password) return true;
  try {
    return await bcrypt.compare(String(password), storedHash);
  } catch {
    return false;
  }
}

function userStore() {
  if (postgresDb.isEnabled()) return postgresDb;
  if (supabaseDb.isEnabled()) return supabaseDb;
  return null;
}

router.post('/login', async (req, res) => {
  const { login, username, password } = req.body;
  const loginVal = (login || username || '').trim().toLowerCase();

  if (!loginVal || !password) {
    return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อบัญชีและรหัสผ่าน' });
  }

  let user = null;

  const store = userStore();
  if (store) {
    try {
      const adminUser = await store.getAdminUserByLogin(loginVal);
      if (adminUser && await passwordMatches(password, adminUser.password_hash)) {
        user = {
          id: adminUser.id,
          name: adminUser.name,
          username: adminUser.username,
          email: `${adminUser.username}@meeting.local`,
          role: adminUser.role || 'admin'
        };
      }
    } catch (err) {
      console.error('Database admin login failed:', err.message);
    }
  }

  if (!user) {
    user = USERS.find((candidate) => (
      candidate.username === loginVal ||
      candidate.email === loginVal
    ) && candidate.password === password);
  }

  if (!user) {
    return res.status(401).json({ ok: false, message: 'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง' });
  }

  const token = makeToken(user);
  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  });
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ ok: false, message: 'ไม่ได้เข้าสู่ระบบ' });
  }

  const data = verifyToken(token);
  if (!data) {
    return res.status(401).json({ ok: false, message: 'Token หมดอายุ' });
  }

  let user = USERS.find((candidate) => candidate.id === data.id);
  const store = userStore();
  if (!user && store) {
    try {
      const users = await store.getAdminUsers();
      user = users.find((candidate) => candidate.id === data.id);
    } catch (err) {
      console.error('Database admin profile lookup failed:', err.message);
    }
  }
  if (!user) {
    return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' });
  }

  res.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

module.exports = router;
