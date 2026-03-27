const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');

// GET /api/audit-logs — Admin only
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, message: 'เฉพาะ Admin เท่านั้น' });
    const { limit = 100, page = 1, action } = req.query;
    const query = {};
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await AuditLog.countDocuments(query);
    res.json({ ok: true, logs, total });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
