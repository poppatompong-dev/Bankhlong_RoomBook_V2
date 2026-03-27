const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'กรุณากรอกชื่อ'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'กรุณากรอกอีเมล'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'กรุณากรอกอีเมลที่ถูกต้อง']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
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
