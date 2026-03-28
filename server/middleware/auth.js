const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบ' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id?.toString();

    // ─── Hardcoded admin bypass (ไม่ต้อง query MongoDB) ─────────────────────
    if (id === '000000000000000000000001') {
      req.user = { _id: '000000000000000000000001', role: 'admin', name: 'ผู้ดูแลระบบสูงสุด', username: 'admin' };
      return next();
    }
    if (id === '000000000000000000000002') {
      req.user = { _id: '000000000000000000000002', role: 'admin', name: 'เจง ผู้ดูแลระบบ', username: 'jeng' };
      return next();
    }
    // Legacy bypass (ถ้ามี token เก่า)
    if (id === '000000000000000000000000') {
      req.user = { _id: '000000000000000000000000', role: 'admin', name: 'ผู้ดูแลระบบ', username: 'admin' };
      return next();
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้งาน' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
  }
  next();
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

module.exports = { auth, requireAdmin, generateToken };
