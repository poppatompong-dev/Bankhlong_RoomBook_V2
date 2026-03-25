require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');

const ROOMS = [
  { name: 'ห้องมณีจันทรา', capacity: 20, icon: '💎', floor: '1', location: 'อาคาร 1' },
  { name: 'ห้องพระพุทธสัมฤทธิ์โกสีย์', capacity: 20, icon: '🏛️', floor: '1', location: 'อาคาร 1' },
  { name: 'ห้องชัยบุรี', capacity: 20, icon: '⚔️', floor: '2', location: 'อาคาร 1' },
  { name: 'ห้องประชุมสารสนเทศ', capacity: 10, icon: '💻', floor: '2', location: 'อาคาร 1' },
  { name: 'อาคารเอนกประสงค์', capacity: 200, icon: '🏟️', floor: 'G', location: 'อาคารเอนกประสงค์' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Seed rooms
    const existingRooms = await Room.countDocuments();
    if (existingRooms === 0) {
      await Room.insertMany(ROOMS);
      console.log(`✅ Seeded ${ROOMS.length} rooms`);
    } else {
      console.log(`ℹ️ Rooms already exist (${existingRooms}), skipping`);
    }

    // Create admin user if none exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      await User.create({
        name: 'ผู้ดูแลระบบ',
        email: 'admin@meeting.com',
        password: 'admin123',
        phone: '000-000-0000',
        role: 'admin'
      });
      console.log('✅ Created admin user (admin@meeting.com / admin123)');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create demo user
    const existingUser = await User.findOne({ email: 'user@meeting.com' });
    if (!existingUser) {
      await User.create({
        name: 'สมชาย ใจดี',
        email: 'user@meeting.com',
        password: 'user123',
        phone: '081-234-5678',
        role: 'user'
      });
      console.log('✅ Created demo user (user@meeting.com / user123)');
    } else {
      console.log('ℹ️ Demo user already exists');
    }

    console.log('\n🎉 Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
