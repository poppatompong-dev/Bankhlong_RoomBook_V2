const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth, requireAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// GET /api/users
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// POST /api/users
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { name, username, password, phone, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อ, ชื่อบัญชี และรหัสผ่าน' });
    }
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) return res.status(409).json({ message: 'ชื่อบัญชีนี้ถูกใช้งานแล้ว' });

    const user = await User.create({ name, username: username.trim().toLowerCase(), password, phone: phone || '', role: role || 'user' });
    const result = await User.findById(user._id).select('-password');
    res.status(201).json({ user: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, username, phone, role, password } = req.body;

    if (req.params.id === '000000000000000000000001' || req.params.id === '000000000000000000000002') {
      return res.status(400).json({ message: 'ไม่สามารถแก้ไขบัญชี Admin หลักได้' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'รูปแบบ ID ไม่ถูกต้อง' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });

    if (username && username.trim().toLowerCase() !== user.username) {
      const dup = await User.findOne({ username: username.trim().toLowerCase() });
      if (dup) return res.status(409).json({ message: 'ชื่อบัญชีนี้ถูกใช้งานแล้ว' });
      user.username = username.trim().toLowerCase();
    }
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (password) user.password = password;

    await user.save();
    const updated = await User.findById(user._id).select('-password');
    res.json({ user: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === '000000000000000000000001' || req.params.id === '000000000000000000000002') {
      return res.status(400).json({ message: 'ไม่สามารถลบบัญชี Admin หลักได้' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'รูปแบบ ID ไม่ถูกต้อง' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
