const express = require('express');
const postgresDb = require('../services/postgresDb');
const supabaseDb = require('../services/supabaseDb');
const { DEFAULT_ROOM_LAYOUTS } = require('../services/defaultRoomLayouts');

const router = express.Router();

let LAYOUTS = DEFAULT_ROOM_LAYOUTS.map(layout => ({ ...layout, _id: layout.id }));

function layoutStore() {
  if (postgresDb.isEnabled()) return postgresDb;
  if (supabaseDb.isEnabled()) return supabaseDb;
  return null;
}

function normalizeLayout(layout) {
  return {
    ...layout,
    id: layout.id || layout._id,
    _id: layout._id || layout.id,
    label: String(layout.label || '').trim(),
    icon: layout.icon || '▦',
    sortOrder: Number(layout.sortOrder ?? layout.sort_order ?? 0),
    isActive: layout.isActive !== false
  };
}

function genLayoutId(label) {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `layout_${slug || Date.now().toString(36)}`;
}

function visibleLayouts(layouts, includeInactive) {
  return layouts
    .map(normalizeLayout)
    .filter(layout => includeInactive || layout.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const store = layoutStore();
    const layouts = store ? await store.getRoomLayouts() : LAYOUTS;
    res.json({ ok: true, layouts: visibleLayouts(layouts, includeInactive) });
  } catch (err) {
    console.error('Room layouts lookup failed:', err.message);
    res.json({
      ok: true,
      layouts: visibleLayouts(DEFAULT_ROOM_LAYOUTS, req.query.includeInactive === 'true'),
      warning: 'Using default room layouts because the database table is unavailable'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const label = String(req.body.label || '').trim();
    if (!label) return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อรูปแบบการจัดห้อง' });

    const store = layoutStore();
    const layout = normalizeLayout({
      id: req.body.id || genLayoutId(label),
      label,
      icon: req.body.icon || '▦',
      sortOrder: req.body.sortOrder ?? 0,
      isActive: req.body.isActive !== false
    });
    const layouts = store ? await store.getRoomLayouts() : LAYOUTS;
    if (layouts.some(item => item.id === layout.id || item._id === layout.id)) {
      return res.status(409).json({ ok: false, message: 'รหัสรูปแบบนี้มีอยู่แล้ว' });
    }

    const saved = store ? await store.createRoomLayout(layout) : layout;
    if (!store) LAYOUTS.push(saved);
    res.status(201).json({ ok: true, message: 'เพิ่มรูปแบบการจัดห้องสำเร็จ', layout: normalizeLayout(saved) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const fields = {};
    if (req.body.label !== undefined) fields.label = String(req.body.label).trim();
    if (req.body.icon !== undefined) fields.icon = req.body.icon || '▦';
    if (req.body.sortOrder !== undefined) fields.sortOrder = Number(req.body.sortOrder) || 0;
    if (req.body.isActive !== undefined) fields.isActive = req.body.isActive !== false;

    const store = layoutStore();
    if (store) {
      const updated = await store.updateRoomLayout(req.params.id, fields);
      return res.json({ ok: true, message: 'แก้ไขรูปแบบการจัดห้องสำเร็จ', layout: normalizeLayout(updated) });
    }

    const idx = LAYOUTS.findIndex(layout => layout.id === req.params.id || layout._id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบรูปแบบการจัดห้อง' });
    LAYOUTS[idx] = normalizeLayout({ ...LAYOUTS[idx], ...fields });
    res.json({ ok: true, message: 'แก้ไขรูปแบบการจัดห้องสำเร็จ', layout: LAYOUTS[idx] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const store = layoutStore();
    if (store) {
      await store.deleteRoomLayout(req.params.id);
      return res.json({ ok: true, message: 'ลบรูปแบบการจัดห้องสำเร็จ', id: req.params.id });
    }

    const idx = LAYOUTS.findIndex(layout => layout.id === req.params.id || layout._id === req.params.id);
    if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบรูปแบบการจัดห้อง' });
    LAYOUTS.splice(idx, 1);
    res.json({ ok: true, message: 'ลบรูปแบบการจัดห้องสำเร็จ', id: req.params.id });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
