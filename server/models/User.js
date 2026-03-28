const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'กรุณากรอกชื่อ-นามสกุล'],
    trim: true,
    maxlength: 100
  },
  username: {
    type: String,
    required: [true, 'กรุณากรอกชื่อบัญชีผู้ใช้'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 50
  },
  // email เก็บไว้ optional เพื่อ backward compat แต่ไม่บังคับ
  email: {
    type: String,
    default: '',
    trim: true
  },
  password: {
    type: String,
    required: [true, 'กรุณากรอกรหัสผ่าน'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
