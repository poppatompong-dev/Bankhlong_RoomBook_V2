const express = require('express');
const router = express.Router();
const sheets = require('../services/sheets');
const line = require('../services/lineNotify');
const { validateBookingBody, genId } = require('../utils/validation');

/**
 * GET /api/bookings/health-check (Internal test)
 */
router.get('/health-check', (req, res) => {
  res.json({ ok: true, message: 'Booking routes are active' });
});

/**
 * GET /api/bookings/check-availability
 * Check if a slot is free before submitting the form
 * Query: ?room=&date=&startTime=&endTime=
 * CRITICAL: This MUST be above /:id to avoid shadowing.
 */
router.get('/check-availability', async (req, res) => {
  try {
    const { room, date, startTime, endTime } = req.query;
    if (!room || !date || !startTime || !endTime) {
      return res.status(400).json({ ok: false, message: 'ขาด parameter: room, date, startTime, endTime' });
    }

    const bookings = await sheets.getAllBookings();
    const conflicts = sheets.findConflicts(bookings, room, date, startTime, endTime);
    const isAvailable = conflicts.length === 0;

    res.json({
      ok: true,
      available: isAvailable,
      conflicts: isAvailable ? [] : conflicts.map(c => ({
        id: c.id,
        name: c.name,
        startTime: c.startTime,
        endTime: c.endTime
      }))
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * GET /api/bookings
 * List all bookings
 */
router.get('/', async (req, res) => {
  try {
    let bookings = await sheets.getAllBookings();
    const { date, room, status } = req.query;
    if (date) bookings = bookings.filter(b => b.date === date);
    if (room) bookings = bookings.filter(b => b.room === room);
    if (status) bookings = bookings.filter(b => b.status === status);

    bookings = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, count: bookings.length, bookings });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'ไม่สามารถดึงข้อมูลได้', error: err.message });
  }
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });
    res.json({ ok: true, booking });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * POST /api/bookings
 */
router.post('/', async (req, res) => {
  try {
    const errors = validateBookingBody(req.body);
    if (errors.length > 0) return res.status(400).json({ ok: false, message: errors[0], errors });

    const { name, phone, room, date, startTime, endTime, purpose } = req.body;
    const allBookings = await sheets.getAllBookings(true);
    const conflicts = sheets.findConflicts(allBookings, room, date, startTime, endTime);

    if (conflicts.length > 0) {
      const c = conflicts[0];
      return res.status(409).json({
        ok: false,
        message: `ห้อง ${room} ถูกจองแล้ว ช่วงเวลา ${c.startTime}–${c.endTime} น. (โดย ${c.name})`,
        conflict: c
      });
    }

    const booking = {
      id: genId(),
      name: name.trim(),
      phone: phone.trim(),
      room: room.trim(),
      date,
      startTime,
      endTime,
      purpose: purpose.trim(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    await sheets.appendBooking(booking);
    sheets.createCalendarEvent(booking).catch(err => console.error('📅 Calendar error:', err.message));
    line.notifyCreated(booking).catch(err => console.error('💬 LINE error:', err.message));

    res.status(201).json({ ok: true, message: 'จองห้องประชุมสำเร็จ', booking });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'เกิดข้อผิดพลาดในการจอง', error: err.message });
  }
});

/**
 * PUT /api/bookings/:id  — Admin edit full booking
 */
router.put('/:id', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });

    const { name, phone, room, date, startTime, endTime, purpose, status } = req.body;
    const fields = {};
    if (name) fields.name = name.trim();
    if (phone) fields.phone = phone.trim();
    if (room) fields.room = room.trim();
    if (date) fields.date = date;
    if (startTime) fields.startTime = startTime;
    if (endTime) fields.endTime = endTime;
    if (purpose) fields.purpose = purpose.trim();
    if (status) fields.status = status;

    // Check conflicts only if time/room changed
    if (room || date || startTime || endTime) {
      const merged = { ...booking, ...fields };
      const conflicts = sheets.findConflicts(bookings, merged.room, merged.date, merged.startTime, merged.endTime, req.params.id);
      if (conflicts.length > 0) {
        const c = conflicts[0];
        return res.status(409).json({ ok: false, message: `ช่วงเวลาซ้อนทับกับ ${c.name} (${c.startTime}–${c.endTime})` });
      }
    }

    const updated = await sheets.updateBooking(req.params.id, fields);
    res.json({ ok: true, message: 'แก้ไขการจองสำเร็จ', booking: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * DELETE /api/bookings/:id  — Admin hard delete
 */
router.delete('/:id', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    const booking = bookings.find(b => b.id === req.params.id);
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });

    await sheets.deleteBooking(req.params.id);
    res.json({ ok: true, message: 'ลบการจองสำเร็จ', id: req.params.id });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 */
router.patch('/:id/cancel', async (req, res) => {
  try {
    const bookings = await sheets.getAllBookings();
    const booking = bookings.find(b => b.id === req.params.id);

    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });
    if (booking.status === 'cancelled') return res.status(400).json({ ok: false, message: 'การจองนี้ถูกยกเลิกแล้ว' });

    await sheets.updateBookingStatus(req.params.id, 'cancelled');

    const { googleEventId } = req.body;
    if (googleEventId) sheets.deleteCalendarEvent(googleEventId).catch(err => console.error('📅 Calendar delete error:', err.message));
    line.notifyCancelled({ ...booking, status: 'cancelled' }).catch(err => console.error('💬 LINE error:', err.message));

    res.json({ ok: true, message: 'ยกเลิกการจองสำเร็จ', booking: { ...booking, status: 'cancelled' } });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'เกิดข้อผิดพลาดในการยกเลิก', error: err.message });
  }
});

module.exports = router;
