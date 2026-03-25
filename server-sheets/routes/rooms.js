/**
 * Rooms list — mutable in-memory store with full CRUD.
 * Seeded with default rooms on startup.
 */

const express = require('express');
const router = express.Router();

let ROOMS = [
  { id: 'r1', name: 'ห้องมณีจันทรา ชั้น 1', capacity: 20, icon: '💎', floor: '1' },
  { id: 'r2', name: 'ห้องพระพุทธสัมฤทธิ์โกสีย์ ชั้น 3', capacity: 30, icon: '🏛️', floor: '3' },
  { id: 'r3', name: 'ห้องชัยบุรี กองสาธารณสุข', capacity: 20, icon: '⚔️', floor: '2' },
  { id: 'r4', name: 'ห้องประชุมสารสนเทศ (ศูนย์ข้อมูลข่าวสาร)', capacity: 10, icon: '💻', floor: '2' },
  { id: 'r5', name: 'อาคารเอนกประสงค์ (โดม)', capacity: 200, icon: '🏟️', floor: 'G' }
];

function genRoomId() {
  return 'r' + Math.random().toString(36).slice(2, 8);
}

// GET /api/rooms
router.get('/', (req, res) => {
  res.json({ ok: true, rooms: ROOMS });
});

// POST /api/rooms — create new room
router.post('/', (req, res) => {
  const { name, capacity, icon, floor } = req.body;
  if (!name || !capacity || !floor) {
    return res.status(400).json({ ok: false, message: 'กรุณากรอก ชื่อห้อง, ความจุ, และชั้น' });
  }
  if (ROOMS.find(r => r.name === name.trim())) {
    return res.status(409).json({ ok: false, message: 'ชื่อห้องนี้มีอยู่แล้ว' });
  }
  const room = {
    id: genRoomId(),
    name: name.trim(),
    capacity: Number(capacity),
    icon: icon || '🏢',
    floor: String(floor).trim()
  };
  ROOMS.push(room);
  console.log(`✅ Room created: ${room.name}`);
  res.status(201).json({ ok: true, message: 'เพิ่มห้องประชุมสำเร็จ', room });
});

// PUT /api/rooms/:id — update room
router.put('/:id', (req, res) => {
  const idx = ROOMS.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบห้อง' });
  const { name, capacity, icon, floor } = req.body;
  if (name && name.trim() !== ROOMS[idx].name && ROOMS.find(r => r.name === name.trim())) {
    return res.status(409).json({ ok: false, message: 'ชื่อห้องนี้มีอยู่แล้ว' });
  }
  const updated = {
    ...ROOMS[idx],
    ...(name && { name: name.trim() }),
    ...(capacity && { capacity: Number(capacity) }),
    ...(icon && { icon }),
    ...(floor && { floor: String(floor).trim() }),
  };
  ROOMS[idx] = updated;
  console.log(`✅ Room updated: ${updated.name}`);
  res.json({ ok: true, message: 'แก้ไขห้องประชุมสำเร็จ', room: updated });
});

// DELETE /api/rooms/:id — delete room
router.delete('/:id', async (req, res) => {
  const idx = ROOMS.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, message: 'ไม่พบห้อง' });
  const room = ROOMS[idx];
  ROOMS.splice(idx, 1);
  console.log(`✅ Room deleted: ${room.name}`);
  res.json({ ok: true, message: 'ลบห้องประชุมสำเร็จ', id: req.params.id });
});

// GET /api/rooms/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', async (req, res) => {
  try {
    const room = ROOMS.find(r => r.id === req.params.id);
    if (!room) return res.status(404).json({ ok: false, message: 'ไม่พบห้อง' });

    const { date } = req.query;
    if (!date) return res.status(400).json({ ok: false, message: 'กรุณาระบุวันที่' });

    const sheets = require('../services/sheets');
    const all = await sheets.getAllBookings();
    const roomBookings = all.filter(
      b => b.room === room.name && b.date === date && b.status !== 'cancelled'
    );

    const TIME_SLOTS = [
      '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
      '19:00', '19:30', '20:00'
    ];

    const bookedSlots = new Set();
    roomBookings.forEach(b => {
      TIME_SLOTS.forEach(t => {
        if (t >= b.startTime && t < b.endTime) bookedSlots.add(t);
      });
    });

    const slots = TIME_SLOTS.map(t => ({ time: t, available: !bookedSlots.has(t) }));

    res.json({ ok: true, room, date, slots, bookings: roomBookings });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
