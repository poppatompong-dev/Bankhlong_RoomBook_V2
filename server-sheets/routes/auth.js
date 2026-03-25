/**
 * Minimal auth routes for the React client.
 * Uses in-memory user list (no real DB needed in Sheets mode).
 *
 * In production, replace with your actual user store / SSO.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ─── Admin credentials (from .env) ──────────────────────────────────────────
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

const USERS = [
  { id: 'u1', name: 'ผู้ดูแลระบบ', username: ADMIN_USERNAME, email: `${ADMIN_USERNAME}@meeting.local`, password: ADMIN_PASSWORD, role: 'admin' }
];

// ─── Tiny token helper (no jwt dependency needed) ───────────────────────────
function makeToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 86400000 })).toString('base64');
  const sig = crypto.createHmac('sha256', process.env.TOKEN_SECRET || 'sheets-secret').update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  try {
    const [payload] = token.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (data.exp < Date.now()) return null;
    return data;
  } catch { return null; }
}

// Export so middleware can use it
module.exports.verifyToken = verifyToken;

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ ok: false, message: 'กรุณากรอก username และ password' });

  const user = USERS.find(u => (u.username === username || u.email === username) && u.password === password);
  if (!user) return res.status(401).json({ ok: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

  const token = makeToken(user);
  res.json({
    ok: true,
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role }
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, message: 'ไม่ได้เข้าสู่ระบบ' });

  const data = verifyToken(token);
  if (!data) return res.status(401).json({ ok: false, message: 'Token หมดอายุ' });

  const user = USERS.find(u => u.id === data.id);
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' });

  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

module.exports = router;
