const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { auth } = require('../middleware/auth');
const { bookingRules, handleValidation } = require('../middleware/validate');
const { bookingLimiter } = require('../middleware/rateLimit');
const lineNotify = require('../services/lineNotify');

// ─── Helper: normalize booking doc → flat object for frontend ────────────────
function normalizeBooking(b) {
  const roomDoc = b.roomId && typeof b.roomId === 'object' ? b.roomId : null;
  return {
    id: b._id,
    _id: b._id,
    // ผู้จอง
    name: b.requesterName || (b.userId?.name) || '',
    phone: b.requesterPhone || (b.userId?.phone) || '',
    dept: b.requesterDept || '',
    // ห้อง
    room: roomDoc?.name || '',
    roomIcon: roomDoc?.icon || '🏢',
    roomId: roomDoc?._id || b.roomId,
    // เวลา
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    // รายละเอียด
    purpose: b.purpose,
    activity: b.activity || '',
    attendees: b.attendees || 0,
    roomLayout: b.roomLayout || '',
    setupBefore: b.setupBefore || 0,
    cleanupAfter: b.cleanupAfter || 0,
    // อุปกรณ์ / บริการ
    equipment: b.equipment || {},
    additionalServices: b.additionalServices || {},
    dressCode: b.dressCode || '',
    restrictions: b.restrictions || '',
    // สถานะ
    status: b.status,
    adminNote: b.adminNote || '',
    createdAt: b.createdAt
  };
}

// GET /api/bookings — PUBLIC, ไม่ต้อง login
router.get('/', async (req, res) => {
  try {
    const { date, roomId, status, page = 1, limit = 200 } = req.query;
    const query = {};
    if (date) query.date = date;
    if (roomId) query.roomId = roomId;
    if (status) query.status = status;

    const docs = await Booking.find(query)
      .populate('roomId', 'name icon capacity floor')
      .populate('userId', 'name phone')
      .sort({ date: 1, startTime: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Booking.countDocuments(query);
    res.json({ ok: true, bookings: docs.map(normalizeBooking), total });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/bookings — Guest booking (ไม่ต้อง login)
router.post('/', bookingLimiter, bookingRules, handleValidation, async (req, res) => {
  try {
    const {
      // รองรับทั้ง field ใหม่และเก่า
      requesterName, name,
      requesterPhone, phone,
      requesterDept, dept,
      roomId, room,
      date, startTime, endTime, purpose, activity,
      attendees, roomLayout, setupBefore, cleanupAfter,
      equipment, additionalServices, dressCode, restrictions
    } = req.body;

    const bookerName = (requesterName || name || '').trim();
    const bookerPhone = (requesterPhone || phone || '').trim();
    const bookerDept = (requesterDept || dept || '').trim();

    if (!bookerName) return res.status(400).json({ ok: false, message: 'กรุณากรอกชื่อผู้จอง' });
    if (!bookerPhone) return res.status(400).json({ ok: false, message: 'กรุณากรอกเบอร์โทรศัพท์' });

    // resolve ห้องจากชื่อหรือ ID
    let roomDoc;
    if (roomId) {
      roomDoc = await Room.findById(roomId);
    } else if (room) {
      roomDoc = await Room.findOne({ name: room.trim() });
    }
    if (!roomDoc) return res.status(404).json({ ok: false, message: 'ไม่พบห้องประชุม' });

    // ห้ามจองวันที่ผ่านมา
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) return res.status(400).json({ ok: false, message: 'ไม่สามารถจองวันที่ผ่านมาแล้ว' });

    // ตรวจ conflict
    const overlapping = await Booking.findOverlapping(roomDoc._id, date, startTime, endTime);
    if (overlapping.length > 0) {
      return res.status(409).json({ ok: false, message: 'เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น' });
    }

    const booking = await Booking.create({
      requesterName: bookerName,
      requesterPhone: bookerPhone,
      requesterDept: bookerDept,
      roomId: roomDoc._id,
      date, startTime, endTime, purpose: purpose?.trim() || '',
      activity: activity?.trim() || '',
      attendees: Number(attendees) || 0,
      roomLayout: roomLayout || '',
      setupBefore: Number(setupBefore) || 0,
      cleanupAfter: Number(cleanupAfter) || 0,
      equipment: equipment || {},
      additionalServices: additionalServices || {},
      dressCode: dressCode || '',
      restrictions: restrictions || '',
      status: 'pending'
    });

    await booking.populate('roomId', 'name icon capacity floor');

    lineNotify.notifyBookingCreated(booking, roomDoc, { name: bookerName });

    const io = req.app.get('io');
    if (io) io.emit('booking:created', normalizeBooking(booking));

    res.status(201).json({ ok: true, message: 'จองห้องประชุมสำเร็จ รอการอนุมัติ', booking: normalizeBooking(booking) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/bookings/:id — Admin: แก้ไข/อนุมัติ/ยกเลิก
router.put('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('roomId', 'name icon');
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId && booking.userId.toString() === req.user._id.toString();

    const {
      status, name, phone, dept, room, date, startTime, endTime,
      purpose, activity, attendees, roomLayout, setupBefore, cleanupAfter,
      equipment, additionalServices, dressCode, restrictions, adminNote
    } = req.body;

    if (isAdmin) {
      // Admin: อัปเดตทุกฟิลด์
      if (name !== undefined) booking.requesterName = name.trim();
      if (phone !== undefined) booking.requesterPhone = phone.trim();
      if (dept !== undefined) booking.requesterDept = dept.trim();
      if (date !== undefined) booking.date = date;
      if (startTime !== undefined) booking.startTime = startTime;
      if (endTime !== undefined) booking.endTime = endTime;
      if (purpose !== undefined) booking.purpose = purpose.trim();
      if (activity !== undefined) booking.activity = activity.trim();
      if (attendees !== undefined) booking.attendees = Number(attendees);
      if (roomLayout !== undefined) booking.roomLayout = roomLayout;
      if (setupBefore !== undefined) booking.setupBefore = Number(setupBefore);
      if (cleanupAfter !== undefined) booking.cleanupAfter = Number(cleanupAfter);
      if (equipment !== undefined) booking.equipment = equipment;
      if (additionalServices !== undefined) booking.additionalServices = additionalServices;
      if (dressCode !== undefined) booking.dressCode = dressCode;
      if (restrictions !== undefined) booking.restrictions = restrictions;
      if (adminNote !== undefined) booking.adminNote = adminNote;

      if (room !== undefined) {
        const roomDoc = await Room.findOne({ name: room.trim() });
        if (roomDoc) booking.roomId = roomDoc._id;
      }

      if (status === 'approved' || status === 'confirmed') {
        booking.status = 'approved';
        booking.approvedBy = req.user._id;
      } else if (status === 'cancelled') {
        booking.status = 'cancelled';
        booking.cancelledBy = req.user._id;
      } else if (status === 'pending') {
        booking.status = 'pending';
      }

      await booking.save();
      await booking.populate('roomId', 'name icon capacity floor');
      const io = req.app.get('io');
      if (io) io.emit('booking:updated', normalizeBooking(booking));
      return res.json({ ok: true, message: 'อัปเดตการจองสำเร็จ', booking: normalizeBooking(booking) });
    }

    // User: ยกเลิกได้เฉพาะของตัวเอง
    if (isOwner && status === 'cancelled') {
      booking.status = 'cancelled';
      booking.cancelledBy = req.user._id;
      await booking.save();
      return res.json({ ok: true, message: 'ยกเลิกการจองสำเร็จ' });
    }

    return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์แก้ไขการจองนี้' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/bookings/:id — Admin หรือเจ้าของ
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });
    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId && booking.userId.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์' });
    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    await booking.save();
    const io = req.app.get('io');
    if (io) io.emit('booking:cancelled', { id: booking._id });
    res.json({ ok: true, message: 'ยกเลิกการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
