const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { auth } = require('../middleware/auth');
const { bookingRules, handleValidation } = require('../middleware/validate');
const { bookingLimiter } = require('../middleware/rateLimit');

const googleCalendar = require('../services/googleCalendar');
const AuditLog = require('../models/AuditLog');

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

// GET /api/bookings/analytics — Admin statistics
router.get('/analytics', async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month); // 1-12 or undefined = all year

    // Build date filter
    let dateFilter = {};
    if (m) {
      const pad = String(m).padStart(2, '0');
      const lastDay = new Date(y, m, 0).getDate();
      dateFilter = { date: { $gte: `${y}-${pad}-01`, $lte: `${y}-${pad}-${lastDay}` } };
    } else {
      dateFilter = { date: { $gte: `${y}-01-01`, $lte: `${y}-12-31` } };
    }

    const activeFilter = { ...dateFilter, status: { $ne: 'cancelled' } };

    // 1. Totals
    const totalBookings = await Booking.countDocuments({ ...dateFilter });
    const approvedBookings = await Booking.countDocuments({ ...dateFilter, status: 'approved' });
    const cancelledBookings = await Booking.countDocuments({ ...dateFilter, status: 'cancelled' });

    // 2. Room utilization (simple grouping, calculate hours in JS)
    const roomUtil = await Booking.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$roomId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } }
    ]);

    // Calculate total hours per room in JS (safer than $toDate aggregation)
    const activeBookings = await Booking.find(activeFilter).select('roomId startTime endTime');
    const roomHours = {};
    activeBookings.forEach(b => {
      try {
        const rid = b.roomId?.toString();
        const [sh, sm] = (b.startTime || '0:0').split(':').map(Number);
        const [eh, em] = (b.endTime || '0:0').split(':').map(Number);
        const hrs = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        if (hrs > 0) roomHours[rid] = (roomHours[rid] || 0) + hrs;
      } catch (_) {}
    });

    // 3. Monthly trend
    const monthlyTrend = await Booking.aggregate([
      { $match: { date: { $gte: `${y}-01-01`, $lte: `${y}-12-31` }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $substr: ['$date', 0, 7] }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } }
    ]);

    // 4. Peak hours (top 8)
    const hourCounts = {};
    activeBookings.forEach(b => {
      try {
        const [sh] = (b.startTime || '0:0').split(':').map(Number);
        const [eh] = (b.endTime || '0:0').split(':').map(Number);
        for (let h = sh; h < eh; h++) {
          const k = `${String(h).padStart(2, '0')}:00`;
          hourCounts[k] = (hourCounts[k] || 0) + 1;
        }
      } catch (_) {}
    });
    const peakHours = Object.entries(hourCounts)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 5. Busiest day of week
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    activeBookings.forEach(b => {
      try {
        const d = new Date(b.date || '2000-01-01');
        if (!isNaN(d.getTime())) dayCounts[d.getDay()]++;
      } catch (_) {}
    });
    const busiestDay = dayCounts.indexOf(Math.max(...dayCounts));

    // 6. Dept breakdown (top 10)
    const deptBreakdown = await Booking.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$requesterDept', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 7. Recent bookings for report
    const recentBookings = await Booking.find(activeFilter)
      .populate('roomId', 'name icon')
      .sort({ date: -1, startTime: -1 })
      .limit(50);

    res.json({
      ok: true,
      year: y, month: m || null,
      totalBookings, approvedBookings, cancelledBookings,
      roomUtilization: roomUtil.map(r => ({
        room: r.room ? { _id: r.room._id, name: r.room.name, icon: r.room.icon || '🏢' } : { _id: r._id, name: 'ไม่ระบุ', icon: '🏢' },
        bookingCount: r.bookingCount,
        totalHours: Math.round((roomHours[r._id?.toString()] || 0) * 10) / 10
      })),
      monthlyTrend,
      peakHours,
      busiestDay,
      hourCounts,
      deptBreakdown: deptBreakdown.map(d => ({ dept: d._id || 'ไม่ระบุ', count: d.count })),
      recentBookings: recentBookings.map(normalizeBooking)
    });
  } catch (err) {
    console.error('Analytics error:', err);
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
      status: 'approved'
    });

    await booking.populate('roomId', 'name icon capacity floor location');

    // สร้าง Google Calendar event ทันทีที่จองสำเร็จ (status=approved)
    const gcalResult = await googleCalendar.createEvent(booking, roomDoc);
    if (gcalResult.eventId) {
      booking.googleEventId = gcalResult.eventId;
      await booking.save();
    }



    // Audit log
    AuditLog.create({
      action: 'booking.created',
      bookingId: booking._id,
      performedBy: bookerName,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      detail: { room: roomDoc.name, date, startTime, endTime, purpose: purpose?.trim() }
    }).catch(() => { });

    const io = req.app.get('io');
    if (io) io.emit('booking:created', normalizeBooking(booking));

    res.status(201).json({ ok: true, message: '✅ จองห้องประชุมสำเร็จ! มีผลทันที', booking: normalizeBooking(booking) });
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

      if (status === 'approved') {
        booking.status = 'approved';
        booking.approvedBy = req.user._id;
      } else if (status === 'cancelled') {
        booking.status = 'cancelled';
        booking.cancelledBy = req.user._id;
      }

      await booking.save();
      await booking.populate('roomId', 'name icon capacity floor location');

      // Google Calendar: อัปเดต หรือ ลบ event ตามสถานะ
      if (booking.status === 'cancelled') {
        if (booking.googleEventId) {
          await googleCalendar.deleteEvent(booking.googleEventId);
          booking.googleEventId = null;
          await booking.save();
        }
      } else {
        if (booking.googleEventId) {
          await googleCalendar.updateEvent(booking.googleEventId, booking, booking.roomId);
        } else {
          const gcal = await googleCalendar.createEvent(booking, booking.roomId);
          if (gcal.eventId) { booking.googleEventId = gcal.eventId; await booking.save(); }
        }
      }

      // Audit log
      AuditLog.create({
        action: 'booking.updated',
        bookingId: booking._id,
        performedBy: req.user.name || req.user.email,
        userId: req.user._id,
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        detail: { status: booking.status, changes: req.body }
      }).catch(() => { });

      const io = req.app.get('io');
      if (io) io.emit('booking:updated', normalizeBooking(booking));
      return res.json({ ok: true, message: 'อัปเดตการจองสำเร็จ', booking: normalizeBooking(booking) });
    }

    // User: ยกเลิกได้เฉพาะของตัวเอง
    if (isOwner && status === 'cancelled') {
      booking.status = 'cancelled';
      booking.cancelledBy = req.user._id;
      if (booking.googleEventId) {
        await googleCalendar.deleteEvent(booking.googleEventId);
        booking.googleEventId = null;
      }
      await booking.save();
      AuditLog.create({
        action: 'booking.cancelled',
        bookingId: booking._id,
        performedBy: req.user.name || req.user.email,
        userId: req.user._id,
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        detail: { reason: 'user_cancelled' }
      }).catch(() => { });
      return res.json({ ok: true, message: 'ยกเลิกการจองสำเร็จ' });
    }

    return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์แก้ไขการจองนี้' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/bookings/:id/cancel — Admin: ยกเลิกการจอง
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('roomId', 'name icon');
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });
    if (req.user.role !== 'admin') return res.status(403).json({ ok: false, message: 'เฉพาะ Admin เท่านั้น' });
    if (booking.status === 'cancelled') return res.status(400).json({ ok: false, message: 'ยกเลิกไปแล้ว' });

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    if (booking.googleEventId) {
      await googleCalendar.deleteEvent(booking.googleEventId);
      booking.googleEventId = null;
    }
    await booking.save();

    AuditLog.create({
      action: 'booking.cancelled',
      bookingId: booking._id,
      performedBy: req.user.name || req.user.email,
      userId: req.user._id,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      detail: { reason: 'admin_cancelled', room: booking.roomId?.name, date: booking.date }
    }).catch(() => { });

    const io = req.app.get('io');
    if (io) io.emit('booking:updated', normalizeBooking(booking));
    res.json({ ok: true, message: 'ยกเลิกการจองสำเร็จ', booking: normalizeBooking(booking) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/bookings/:id — Admin: ลบถาวร
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ ok: false, message: 'ไม่พบการจอง' });

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.userId && String(booking.userId) === String(req.user._id);
    if (!isAdmin && !isOwner) return res.status(403).json({ ok: false, message: 'คุณไม่มีสิทธิ์' });

    // ลบ Google Calendar event ถ้ามี
    if (booking.googleEventId) {
      try { await googleCalendar.deleteEvent(booking.googleEventId); } catch(_) {}
    }

    // ลบจาก DB จริง
    await Booking.findByIdAndDelete(req.params.id);

    AuditLog.create({
      action: 'booking.deleted',
      bookingId: booking._id,
      performedBy: req.user.name || req.user.username || 'admin',
      userId: req.user._id,
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      detail: { deletedBy: isAdmin ? 'admin' : 'owner' }
    }).catch(() => {});

    const io = req.app.get('io');
    if (io) io.emit('booking:cancelled', { id: booking._id });
    res.json({ ok: true, message: 'ลบการจองสำเร็จ' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
