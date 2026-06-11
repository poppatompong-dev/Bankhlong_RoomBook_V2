const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBookingBody } = require('./validation');

const validBooking = {
  name: 'สมชาย ใจดี',
  phone: '0812345678',
  room: 'ห้องมณีจันทรา ชั้น 1',
  date: '2027-01-15',
  startTime: '07:00',
  endTime: '20:00',
  purpose: 'ประชุมทั้งวัน'
};

test('allows an all-day same-day booking when end time is after start time', () => {
  assert.deepEqual(validateBookingBody(validBooking), []);
});

test('still rejects a booking whose end time is not after start time', () => {
  const errors = validateBookingBody({
    ...validBooking,
    startTime: '17:00',
    endTime: '08:00'
  });

  assert.ok(errors.includes('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม'));
});
