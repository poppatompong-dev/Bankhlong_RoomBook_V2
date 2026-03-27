const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // ─── ผู้จอง (รองรับทั้ง guest และ user ที่ login) ─────────────────────────
  requesterName: { type: String, required: [true, 'กรุณากรอกชื่อผู้จอง'], trim: true },
  requesterPhone: { type: String, required: [true, 'กรุณากรอกเบอร์โทร'], trim: true },
  requesterDept: { type: String, default: '', trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ─── ห้องประชุม ──────────────────────────────────────────────────────────
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },

  // ─── วัน/เวลา ──────────────────────────────────────────────────────────
  date: { type: String, required: [true, 'กรุณาระบุวันที่'] },
  startTime: { type: String, required: [true, 'กรุณาระบุเวลาเริ่ม'] },
  endTime: { type: String, required: [true, 'กรุณาระบุเวลาสิ้นสุด'] },

  // ─── รายละเอียดกิจกรรม ───────────────────────────────────────────────────
  purpose: { type: String, required: [true, 'กรุณาระบุวัตถุประสงค์'], trim: true, maxlength: 500 },
  activity: { type: String, default: '', trim: true, maxlength: 200 },
  attendees: { type: Number, default: 0, min: 0 },
  roomLayout: { type: String, enum: ['classroom', 'conference', 'ushape', 'theater', 'banquet', 'other', ''], default: '' },
  setupBefore: { type: Number, default: 0 },
  cleanupAfter: { type: Number, default: 0 },

  // ─── ความต้องการอุปกรณ์ ──────────────────────────────────────────────────
  equipment: {
    sound: { type: Boolean, default: false },
    micCount: { type: Number, default: 0 },
    micType: { type: String, default: '' },
    projector: { type: Boolean, default: false },
    tv: { type: Boolean, default: false },
    laptop: { type: Boolean, default: false },
    whiteboard: { type: Boolean, default: false },
    flipchart: { type: Boolean, default: false },
    videoConference: { type: Boolean, default: false },
    internet: { type: Boolean, default: false },
    other: { type: String, default: '' }
  },

  // ─── บริการเพิ่มเติม ────────────────────────────────────────────────────
  additionalServices: {
    water: { type: Boolean, default: false },
    waterTime: { type: String, default: '' },
    coffee: { type: Boolean, default: false },
    nameCards: { type: Boolean, default: false },
    signage: { type: Boolean, default: false },
    extraArea: { type: String, default: '' }
  },

  // ─── การแต่งกาย / ข้อห้าม ────────────────────────────────────────────────
  dressCode: { type: String, default: '' },
  restrictions: { type: String, default: '' },

  // ─── สถานะและหมายเหตุ ────────────────────────────────────────────────────
  status: { type: String, enum: ['confirmed', 'cancelled', 'pending', 'approved'], default: 'confirmed' },
  adminNote: { type: String, default: '' },
  googleEventId: { type: String, default: null },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true
});

// Compound index for fast conflict queries
bookingSchema.index({ roomId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, date: 1 });

// Helper: calculate duration in minutes
bookingSchema.methods.getDurationMinutes = function () {
  const [sh, sm] = this.startTime.split(':').map(Number);
  const [eh, em] = this.endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

// Static: check for overlapping bookings
bookingSchema.statics.findOverlapping = async function (roomId, date, startTime, endTime, excludeId = null) {
  const query = {
    roomId,
    date,
    status: { $in: ['confirmed', 'pending', 'approved'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.find(query);
};

module.exports = mongoose.model('Booking', bookingSchema);
