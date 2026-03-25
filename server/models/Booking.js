const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD format
    required: [true, 'กรุณาระบุวันที่']
  },
  startTime: {
    type: String, // HH:MM format
    required: [true, 'กรุณาระบุเวลาเริ่ม']
  },
  endTime: {
    type: String, // HH:MM format
    required: [true, 'กรุณาระบุเวลาสิ้นสุด']
  },
  purpose: {
    type: String,
    required: [true, 'กรุณาระบุวัตถุประสงค์'],
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'cancelled'],
    default: 'pending'
  },
  googleEventId: {
    type: String,
    default: null
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound index for fast conflict queries
bookingSchema.index({ roomId: 1, date: 1, status: 1 });
bookingSchema.index({ userId: 1, date: 1 });

// Helper: calculate duration in minutes
bookingSchema.methods.getDurationMinutes = function() {
  const [sh, sm] = this.startTime.split(':').map(Number);
  const [eh, em] = this.endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

// Static: check for overlapping bookings
bookingSchema.statics.findOverlapping = async function(roomId, date, startTime, endTime, excludeId = null) {
  const query = {
    roomId,
    date,
    status: { $in: ['pending', 'approved'] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.find(query);
};

module.exports = mongoose.model('Booking', bookingSchema);
