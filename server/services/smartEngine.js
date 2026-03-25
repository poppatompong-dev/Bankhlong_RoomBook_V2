// Smart Engine - AI-level features for room booking
const Booking = require('../models/Booking');
const Room = require('../models/Room');

const TIME_SLOTS = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00'
];

class SmartEngine {
  // Suggest suitable rooms based on expected attendees count
  async recommendRooms(date, attendees = 1) {
    const rooms = await Room.find({ isActive: true }).sort({ capacity: 1 });
    const suitableRooms = [];

    for (const room of rooms) {
      if (room.capacity >= attendees) {
        // Count existing bookings for this day
        const bookingCount = await Booking.countDocuments({
          roomId: room._id,
          date,
          status: { $in: ['pending', 'approved'] }
        });

        suitableRooms.push({
          room,
          bookingCount,
          utilizationScore: bookingCount / TIME_SLOTS.length,
          sizeMatch: room.capacity - attendees // Lower = better fit
        });
      }
    }

    // Sort by best fit (smallest room that fits + least utilized)
    suitableRooms.sort((a, b) => {
      if (a.sizeMatch !== b.sizeMatch) return a.sizeMatch - b.sizeMatch;
      return a.utilizationScore - b.utilizationScore;
    });

    return suitableRooms;
  }

  // Suggest best available time slots for a room/date
  async suggestTimeSlots(roomId, date, durationMinutes = 60) {
    const bookings = await Booking.find({
      roomId,
      date,
      status: { $in: ['pending', 'approved'] }
    });

    // Build booked time set
    const bookedSlots = new Set();
    bookings.forEach(b => {
      TIME_SLOTS.forEach(t => {
        if (t >= b.startTime && t < b.endTime) bookedSlots.add(t);
      });
    });

    // Find consecutive available slots
    const slotsNeeded = Math.ceil(durationMinutes / 30);
    const suggestions = [];

    for (let i = 0; i <= TIME_SLOTS.length - slotsNeeded; i++) {
      let available = true;
      for (let j = 0; j < slotsNeeded; j++) {
        if (bookedSlots.has(TIME_SLOTS[i + j])) {
          available = false;
          break;
        }
      }
      if (available) {
        const startTime = TIME_SLOTS[i];
        const endTime = TIME_SLOTS[i + slotsNeeded];
        if (endTime) {
          // Score: prefer morning (9-12) and early afternoon (13-15)
          const hour = parseInt(startTime.split(':')[0]);
          let score = 50;
          if (hour >= 9 && hour <= 11) score = 100; // Best: morning
          else if (hour >= 13 && hour <= 14) score = 80; // Good: early afternoon
          else if (hour >= 8 && hour <= 12) score = 70;
          else if (hour >= 15 && hour <= 16) score = 60;

          suggestions.push({ startTime, endTime, score });
        }
      }
    }

    // Sort by score (best times first)
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, 5);
  }

  // Detect near-conflict bookings and suggest alternatives
  async detectConflicts(roomId, date, startTime, endTime) {
    const conflicts = await Booking.findOverlapping(roomId, date, startTime, endTime);

    if (conflicts.length === 0) return { hasConflict: false, alternatives: [] };

    // Find alternative rooms
    const rooms = await Room.find({ isActive: true, _id: { $ne: roomId } });
    const alternatives = [];

    for (const room of rooms) {
      const roomConflicts = await Booking.findOverlapping(room._id, date, startTime, endTime);
      if (roomConflicts.length === 0) {
        alternatives.push({
          type: 'room',
          room,
          startTime,
          endTime,
          message: `ใช้ ${room.name} แทน (${room.capacity} ที่นั่ง)`
        });
      }
    }

    // Find alternative times in same room
    const durationMinutes = this._timeDiff(startTime, endTime);
    const timeAlternatives = await this.suggestTimeSlots(roomId, date, durationMinutes);

    timeAlternatives.forEach(slot => {
      alternatives.push({
        type: 'time',
        roomId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        message: `เปลี่ยนเวลาเป็น ${slot.startTime} - ${slot.endTime}`
      });
    });

    return {
      hasConflict: true,
      conflicts: conflicts.length,
      alternatives: alternatives.slice(0, 5)
    };
  }

  // Usage analytics
  async getAnalytics(startDate, endDate) {
    const query = { status: { $in: ['approved', 'pending'] } };
    if (startDate) query.date = { $gte: startDate };
    if (endDate) query.date = { ...query.date, $lte: endDate };

    const bookings = await Booking.find(query).populate('roomId');
    const rooms = await Room.find({ isActive: true });

    // Room utilization
    const roomStats = {};
    rooms.forEach(r => {
      roomStats[r._id.toString()] = {
        room: r,
        bookingCount: 0,
        totalMinutes: 0
      };
    });

    // Time heatmap (hour -> count)
    const hourCounts = {};
    TIME_SLOTS.forEach(t => hourCounts[t] = 0);

    // Day of week stats
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

    bookings.forEach(b => {
      const roomKey = b.roomId?._id?.toString() || b.roomId?.toString();
      if (roomStats[roomKey]) {
        roomStats[roomKey].bookingCount++;
        roomStats[roomKey].totalMinutes += this._timeDiff(b.startTime, b.endTime);
      }
      if (hourCounts[b.startTime] !== undefined) hourCounts[b.startTime]++;

      const dayOfWeek = new Date(b.date + 'T00:00:00').getDay();
      dayOfWeekCounts[dayOfWeek]++;
    });

    // Calculate utilization rate (%)
    const totalAvailableMinutes = TIME_SLOTS.length * 30; // per day
    const roomUtilization = Object.values(roomStats).map(rs => ({
      room: rs.room,
      bookingCount: rs.bookingCount,
      totalMinutes: rs.totalMinutes,
      utilizationRate: bookings.length > 0
        ? Math.round((rs.totalMinutes / (totalAvailableMinutes * (this._daysBetween(startDate, endDate) || 30))) * 100)
        : 0
    }));

    // Peak hours
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([time, count]) => ({ time, count }));

    return {
      totalBookings: bookings.length,
      roomUtilization,
      hourCounts,
      peakHours,
      dayOfWeekCounts,
      busiestDay: dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts))
    };
  }

  _timeDiff(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  _daysBetween(start, end) {
    if (!start || !end) return 30;
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e - s) / (1000 * 60 * 60 * 24)) || 1;
  }
}

module.exports = new SmartEngine();
