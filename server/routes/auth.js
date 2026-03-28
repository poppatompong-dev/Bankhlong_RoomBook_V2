const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// POST /api/auth/login — username / password only
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { login, username, password } = req.body;
    const loginVal = (login || username || '').trim().toLowerCase();

    if (!loginVal || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อบัญชีและรหัสผ่าน' });
    }

    // ─── Hardcoded Admin Bypass ───────────────────────────────────────────────
    if (loginVal === 'admin' && password === 'admin123') {
      const token = generateToken('000000000000000000000001');
      return res.json({
        token,
        user: { id: '000000000000000000000001', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', email: '', phone: '-', role: 'admin' }
      });
    }
    if (loginVal === 'jeng' && password === 'jeng') {
      const token = generateToken('000000000000000000000002');
      return res.json({
        token,
        user: { id: '000000000000000000000002', name: 'เจง ผู้ดูแลระบบ', username: 'jeng', email: '', phone: '-', role: 'admin' }
      });
    }

    // ─── DB lookup by username ────────────────────────────────────────────────
    const user = await User.findOne({ username: loginVal }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'ชื่อบัญชีหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error: error.message });
  }
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, username, password, phone, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ชื่อบัญชี และรหัสผ่าน' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'ชื่อบัญชีนี้ถูกใช้งานแล้ว' });
    }

    const user = await User.create({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password,
      phone: phone || '',
      role: role || 'user'
    });

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, username: user.username, email: '', phone: user.phone, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างบัญชี', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const id = req.user._id?.toString();
  // Hardcoded admin bypass
  if (id === '000000000000000000000001') {
    return res.json({ user: { id, name: 'ผู้ดูแลระบบสูงสุด', username: 'admin', email: '', phone: '-', role: 'admin' } });
  }
  if (id === '000000000000000000000002') {
    return res.json({ user: { id, name: 'เจง ผู้ดูแลระบบ', username: 'jeng', email: '', phone: '-', role: 'admin' } });
  }
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email || '',
      phone: req.user.phone || '',
      role: req.user.role
    }
  });
});

module.exports = router;
