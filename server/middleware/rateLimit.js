const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: 'คำขอมากเกินไป กรุณาลองอีกครั้งภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองอีกครั้งภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false
});

// Booking creation limiter
const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { message: 'สร้างการจองมากเกินไป กรุณาลองอีกครั้ง' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter, authLimiter, bookingLimiter };
