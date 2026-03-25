const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { auth, requireAdmin } = require('../middleware/auth');
const { bookingRules, handleValidation } = require('../middleware/validate');
const { bookingLimiter } = require('../middleware/rateLimit');
const googleCalendar = require('../services/googleCalendar');
const lineNotify = require('../services/lineNotify');
const smartEngine = require('../services/smartEngine');

// GET /api/bookings - List bookings
router.get('/', auth, async (req, res) => {
  try {
    const { date, roomId, status, userId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (date) query.date = date;
    if (roomId) query.roomId = roomId;
    if (status) query.status = status;

    // Non-admin users can only see their own bookings + approved ones
    if (req.user.role !== 'admin' && userId !== 'all') {
      if (userId) {
        query.userId = userId;
      }
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'name email phone')
      .populate('roomId', 'name capacity icon floor')
      .sort({ date: -1, startTime: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/bookings - Create booking
router.post('/', auth, bookingLimiter, bookingRules, handleValidation, async (req, res) => {
  try {
    const { roomId, date, startTime, endTime, purpose } = req.body;

    // Validate room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'ไม่พบห้องประชุม' });
    }

    // Validate date not in past
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return res.status(400).json({ message: 'ไม่สามารถจองวันที่ผ่านมาแล้ว' });
    }

    // Check for overlapping bookings (strict)
    const overlapping = await Booking.findOverlapping(room._id, date, startTime, endTime);
    if (overlapping.length > 0) {
      // Get alternatives from smart engine
      const conflicts = await smartEngine.detectConflicts(room._id, date, startTime, endTime);
      return res.status(409).json({
        message: 'เวลานี้ถูกจองแล้ว กรุณาเลือกเวลาอื่น',
        conflicts: conflicts.alternatives
      });
    }

    // Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      roomId: room._id,
      date,
      startTime,
      endTime,
      purpose,
      status: 'pending'
    });

    // Populate for response
    await booking.populate('userId', 'name email phone');
    await booking.populate('roomId', 'name capacity icon floor');

    // Send LINE notification
    lineNotify.notifyBookingCreated(booking, room, req.user);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:created', booking);
    }

    res.status(201).json({
      message: 'สร้างการจองสำเร็จ รอการอนุมัติ',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง', error: error.message });
  }
});

// PUT /api/bookings/:id - Update booking (approve/reject/edit)
router.put('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'ไม่พบการจอง' });
    }

    const { status } = req.body;

    // Status change: only admin can approve
    if (status === 'approved') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบที่สามารถอนุมัติได้' });
      }

      booking.status = 'approved';
      booking.approvedBy = req.user._id;
      await booking.save();

      await booking.populate('userId', 'name email phone');
      await booking.populate('roomId', 'name capacity icon floor');

      // Create Google Calendar event
      const gcalResult = await googleCalendar.createEvent(
        booking,
        booking.roomId,
        booking.userId
      );
      if (gcalResult.eventId) {
        booking.googleEventId = gcalResult.eventId;
        await booking.save();
      }

      // Send LINE notification
      lineNotify.notifyBookingApproved(booking, booking.roomId, booking.userId);

      const io = req.app.get('io');
      if (io) io.emit('booking:updated', booking);

      return res.json({ message: 'อนุมัติการจองสำเร็จ', booking });
    }

    // Cancel: owner or admin
    if (status === 'cancelled') {
      const isOwner = booking.userId.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' });
      }

      booking.status = 'cancelled';
      booking.cancelledBy = req.user._id;
      await booking.save();

      await booking.populate('userId', 'name email phone');
      await booking.populate('roomId', 'name capacity icon floor');

      // Delete Google Calendar event
      if (booking.googleEventId) {
        googleCalendar.deleteEvent(booking.googleEventId);
      }

      // Send LINE notification
      lineNotify.notifyBookingCancelled(booking, booking.roomId, booking.userId);

      const io = req.app.get('io');
      if (io) io.emit('booking:cancelled', booking);

      return res.json({ message: 'ยกเลิกการจองสำเร็จ', booking });
    }

    res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// DELETE /api/bookings/:id - Cancel booking
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'ไม่พบการจอง' });
    }

    const isOwner = booking.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ยกเลิกการจองนี้' });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    await booking.save();

    await booking.populate('userId', 'name email phone');
    await booking.populate('roomId', 'name capacity icon floor');

    if (booking.googleEventId) {
      googleCalendar.deleteEvent(booking.googleEventId);
    }
    lineNotify.notifyBookingCancelled(booking, booking.roomId, booking.userId);

    const io = req.app.get('io');
    if (io) io.emit('booking:cancelled', booking);

    res.json({ message: 'ยกเลิกการจองสำเร็จ', booking });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/bookings/analytics - Usage analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await smartEngine.getAnalytics(startDate, endDate);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/bookings/recommendations - Smart recommendations
router.get('/recommendations', auth, async (req, res) => {
  try {
    const { date, attendees, roomId, duration } = req.query;

    const result = {};

    if (date && attendees) {
      result.rooms = await smartEngine.recommendRooms(date, parseInt(attendees));
    }

    if (date && roomId) {
      result.timeSlots = await smartEngine.suggestTimeSlots(
        roomId,
        date,
        parseInt(duration) || 60
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

module.exports = router;
