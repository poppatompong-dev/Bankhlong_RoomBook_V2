const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

// GET /api/rooms - List all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: 1 });
    // Normalize to match frontend shape: id, name, capacity, icon, floor, location, isActive
    const normalized = rooms.map(r => ({
      id: r._id,
      _id: r._id,
      name: r.name,
      capacity: r.capacity,
      icon: r.icon || '🏢',
      floor: r.floor || '1',
      location: r.location || '',
      isActive: r.isActive !== false
    }));
    res.json({ ok: true, rooms: normalized });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/rooms - Create new room (admin)
router.post('/', auth, async (req, res) => {
  try {
    const { name, capacity, icon, floor, location } = req.body;
    if (!name || !capacity) {
      return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อห้องและความจุ' });
    }
    const exists = await Room.findOne({ name: name.trim() });
    if (exists) {
      return res.status(409).json({ ok: false, message: 'ชื่อห้องนี้มีอยู่แล้ว' });
    }
    const room = await Room.create({
      name: name.trim(),
      capacity: Number(capacity),
      icon: icon || '🏢',
      floor: String(floor || '1').trim(),
      location: (location || '').trim(),
      isActive: true
    });
    res.status(201).json({ ok: true, message: 'เพิ่มห้องประชุมสำเร็จ', room: { id: room._id, ...room.toObject() } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// PUT /api/rooms/:id - Update room (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, capacity, icon, floor, location, isActive } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ ok: false, message: 'ไม่พบห้องประชุม' });

    if (name && name.trim() !== room.name) {
      const exists = await Room.findOne({ name: name.trim(), _id: { $ne: room._id } });
      if (exists) return res.status(409).json({ ok: false, message: 'ชื่อห้องนี้มีอยู่แล้ว' });
    }

    if (name !== undefined) room.name = name.trim();
    if (capacity !== undefined) room.capacity = Number(capacity);
    if (icon !== undefined) room.icon = icon;
    if (floor !== undefined) room.floor = String(floor).trim();
    if (location !== undefined) room.location = location.trim();
    if (isActive !== undefined) room.isActive = isActive;

    await room.save();
    res.json({ ok: true, message: 'แก้ไขห้องประชุมสำเร็จ', room: { id: room._id, ...room.toObject() } });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// DELETE /api/rooms/:id - Delete room (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ ok: false, message: 'ไม่พบห้องประชุม' });
    await room.deleteOne();
    res.json({ ok: true, message: 'ลบห้องประชุมสำเร็จ', id: req.params.id });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/rooms/:id/availability - Get availability for a date
router.get('/:id/availability', auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'กรุณาระบุวันที่' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'ไม่พบห้องประชุม' });
    }

    const bookings = await Booking.find({
      roomId: room._id,
      date,
      status: { $in: ['confirmed', 'pending', 'approved'] }
    }).select('startTime endTime status');

    const TIME_SLOTS = [
      '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
      '19:00', '19:30', '20:00'
    ];

    const bookedSlots = new Set();
    bookings.forEach(b => {
      TIME_SLOTS.forEach(t => {
        if (t >= b.startTime && t < b.endTime) bookedSlots.add(t);
      });
    });

    const slots = TIME_SLOTS.map(t => ({
      time: t,
      available: !bookedSlots.has(t)
    }));

    res.json({ room, date, slots, bookings });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

module.exports = router;
