const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action:      { type: String, required: true },       // 'booking.created' | 'booking.updated' | 'booking.cancelled' | 'booking.deleted'
  bookingId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  performedBy: { type: String, default: 'guest' },     // user name หรือ 'guest'
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ip:          { type: String, default: '' },
  detail:      { type: Object, default: {} },           // snapshot ของ booking fields ที่เปลี่ยน
}, { timestamps: true });

auditLogSchema.index({ bookingId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
