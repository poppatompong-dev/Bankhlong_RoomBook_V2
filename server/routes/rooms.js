const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { auth } = require('../middleware/auth');

// GET /api/rooms - List all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true }).sort({ capacity: 1 });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
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
      status: { $in: ['pending', 'approved'] }
    }).select('startTime endTime status');

    const TIME_SLOTS = [
      '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
      '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
      '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
      '19:00','19:30','20:00'
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
