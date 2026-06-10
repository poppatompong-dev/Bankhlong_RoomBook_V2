const express = require('express');
const bcrypt = require('bcryptjs');
const postgresDb = require('../services/postgresDb');
const supabaseDb = require('../services/supabaseDb');

const router = express.Router();

let USERS = [
  {
    id: 'u1',
    _id: 'u1',
    name: 'ผู้ดูแลระบบ',
    username: (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
    phone: '',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

function normalizeUser(user) {
  return {
    ...user,
    id: user.id || user._id,
    _id: user._id || user.id,
    phone: user.phone || '',
    role: user.role || 'admin',
    isActive: user.isActive !== false
  };
}

function userStore() {
  if (postgresDb.isEnabled()) return postgresDb;
  if (supabaseDb.isEnabled()) return supabaseDb;
  return null;
}

async function hashPassword(password) {
  if (!password) return null;
  return bcrypt.hash(String(password), 10);
}

router.get('/', async (_req, res) => {
  try {
    const store = userStore();
    const users = store ? await store.getAdminUsers() : USERS.map(normalizeUser);

    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อ, username และรหัสผ่าน' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const store = userStore();
    const existing = store
      ? await store.getAdminUserByLogin(normalizedUsername)
      : USERS.find(user => user.username === normalizedUsername);

    if (existing) {
      return res.status(409).json({ ok: false, message: 'ชื่อบัญชีนี้มีอยู่แล้ว' });
    }

    const passwordHash = await hashPassword(password);
    const user = store
      ? await store.createAdminUser({ name, username: normalizedUsername, role, passwordHash })
      : normalizeUser({
        id: `u${Date.now()}`,
        name: String(name).trim(),
        username: normalizedUsername,
        phone: req.body.phone || '',
        role: role || 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      });

    if (!store) USERS.push(user);
    res.status(201).json({ ok: true, message: 'เพิ่มผู้ใช้สำเร็จ', user });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const fields = {};
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.username !== undefined) fields.username = req.body.username;
    if (req.body.role !== undefined) fields.role = req.body.role;
    if (req.body.password) fields.passwordHash = await hashPassword(req.body.password);

    const store = userStore();
    if (store) {
      const user = await store.updateAdminUser(req.params.id, fields);
      return res.json({ ok: true, message: 'แก้ไขผู้ใช้สำเร็จ', user });
    }

    const idx = USERS.findIndex(user => user.id === req.params.id || user._id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' });

    USERS[idx] = normalizeUser({ ...USERS[idx], ...fields, updatedAt: new Date().toISOString() });
    res.json({ ok: true, message: 'แก้ไขผู้ใช้สำเร็จ', user: USERS[idx] });
  } catch (err) {
    const status = err.message?.includes('duplicate') ? 409 : 500;
    res.status(status).json({ ok: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const store = userStore();
    if (store) {
      await store.deleteAdminUser(req.params.id);
      return res.json({ ok: true, message: 'ลบผู้ใช้สำเร็จ', id: req.params.id });
    }

    const idx = USERS.findIndex(user => user.id === req.params.id || user._id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' });
    USERS.splice(idx, 1);
    res.json({ ok: true, message: 'ลบผู้ใช้สำเร็จ', id: req.params.id });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
