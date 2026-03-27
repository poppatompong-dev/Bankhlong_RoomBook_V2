const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'ข้อมูลไม่ถูกต้อง',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Booking validation rules
const bookingRules = [
  body('date')
    .notEmpty().withMessage('กรุณาระบุวันที่')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('รูปแบบวันที่ไม่ถูกต้อง'),
  body('startTime')
    .notEmpty().withMessage('กรุณาระบุเวลาเริ่ม')
    .matches(/^\d{2}:\d{2}$/).withMessage('รูปแบบเวลาไม่ถูกต้อง'),
  body('endTime')
    .notEmpty().withMessage('กรุณาระบุเวลาสิ้นสุด')
    .matches(/^\d{2}:\d{2}$/).withMessage('รูปแบบเวลาไม่ถูกต้อง'),
  body('purpose')
    .notEmpty().withMessage('กรุณาระบุวัตถุประสงค์')
    .trim()
    .isLength({ max: 500 }).withMessage('วัตถุประสงค์ต้องไม่เกิน 500 ตัวอักษร'),
  body('startTime').custom((value, { req }) => {
    if (value && req.body.endTime) {
      const [sh, sm] = value.split(':').map(Number);
      const [eh, em] = req.body.endTime.split(':').map(Number);
      const duration = (eh * 60 + em) - (sh * 60 + sm);
      if (duration <= 0) throw new Error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');
      if (duration > 480) throw new Error('ระยะเวลาจองสูงสุด 8 ชั่วโมง');
    }
    return true;
  })
];

// Auth validation rules
const registerRules = [
  body('name').notEmpty().withMessage('กรุณากรอกชื่อ').trim(),
  body('email').isEmail().withMessage('กรุณากรอกอีเมลที่ถูกต้อง').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
];

const loginRules = [
  body('login').notEmpty().withMessage('กรุณากรอกชื่อผู้ใช้หรืออีเมล'),
  body('password').notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
];

module.exports = {
  handleValidation,
  bookingRules,
  registerRules,
  loginRules
};
