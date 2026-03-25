/**
 * Booking validation helpers
 */

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateBookingBody(body) {
  const errors = [];
  const { name, phone, room, date, startTime, endTime, purpose } = body;

  if (!name || !name.trim()) errors.push('กรุณากรอกชื่อ');
  if (!phone || !phone.trim()) errors.push('กรุณากรอกเบอร์โทร');
  if (!room || !room.trim()) errors.push('กรุณาระบุห้องประชุม');
  if (!date || !DATE_REGEX.test(date)) errors.push('วันที่ไม่ถูกต้อง (YYYY-MM-DD)');
  if (!startTime || !TIME_REGEX.test(startTime)) errors.push('เวลาเริ่มไม่ถูกต้อง (HH:MM)');
  if (!endTime || !TIME_REGEX.test(endTime)) errors.push('เวลาสิ้นสุดไม่ถูกต้อง (HH:MM)');
  if (!purpose || !purpose.trim()) errors.push('กรุณาระบุวัตถุประสงค์');

  if (startTime && endTime && errors.length === 0) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);

    if (durationMin <= 0) errors.push('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');
    if (durationMin > 240) errors.push('ระยะเวลาจองสูงสุด 4 ชั่วโมง');
  }

  if (date) {
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) errors.push('ไม่สามารถจองวันที่ผ่านมาแล้ว');
  }

  return errors;
}

// Simple unique ID generator
function genId() {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

module.exports = { validateBookingBody, genId };
