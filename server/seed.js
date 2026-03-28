require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const Room = require('./models/Room');
const User = require('./models/User');
const Booking = require('./models/Booking');

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

    // Create jeng admin (bypass minlength validation, password still hashed via pre-save)
    const existingJeng = await User.findOne({ $or: [{ email: 'jeng@meeting.com' }, { username: 'jeng' }] });
    if (!existingJeng) {
      const jengUser = new User({
        name: 'เจง ผู้ดูแลระบบ',
        email: 'jeng@meeting.com',
        username: 'jeng',
        password: 'jeng',
        phone: '000-000-0001',
        role: 'admin'
      });
      await jengUser.save({ validateBeforeSave: false });
      console.log('✅ Created jeng admin (jeng / jeng  OR  jeng@meeting.com / jeng)');
    } else {
      console.log('ℹ️ Jeng admin already exists');
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

    // ─── Mock Booking Data ───────────────────────────────────────────────────
    const existingBookings = await Booking.countDocuments();
    if (existingBookings > 0) {
      console.log(`ℹ️ Bookings already exist (${existingBookings}), skipping mock data`);
    } else {
      const rooms = await Room.find();
      const roomMap = {};
      rooms.forEach(r => { roomMap[r.name] = r._id; });

      const R = (name) => roomMap[name];

      const MOCK_BOOKINGS = [
        // ─── ห้องมณีจันทรา ───────────────────────────────────────────────────
        {
          requesterName: 'นางสาวพิมพ์ใจ ทองดี',
          requesterPhone: '081-100-1001',
          requesterDept: 'กองคลัง',
          roomId: R('ห้องมณีจันทรา'),
          date: '2026-03-25',
          startTime: '09:00', endTime: '11:00',
          purpose: '🧑‍💼 ประชุมพิจารณาแผนการเงินประจำเดือน',
          activity: 'ประชุมกองคลัง ครั้งที่ 3/2569',
          attendees: 12, roomLayout: 'conference',
          setupBefore: 15, cleanupAfter: 15,
          equipment: { projector: true, whiteboard: true, internet: true },
          additionalServices: { water: true, waterTime: '08:45', nameCards: true },
          status: 'approved',
          adminNote: '✅ อนุมัติแล้ว — จัดเตรียมน้ำดื่มไว้ก่อน 08:45 น.'
        },
        {
          requesterName: 'นายสมศักดิ์ ใจดี',
          requesterPhone: '081-200-2002',
          requesterDept: 'กองคลัง',
          roomId: R('ห้องมณีจันทรา'),
          date: '2026-03-27',
          startTime: '13:00', endTime: '16:00',
          purpose: '📚 อบรมการจัดทำงบประมาณประจำปี 2570',
          activity: '💰 อบรมงบประมาณ',
          attendees: 18, roomLayout: 'classroom',
          setupBefore: 30,
          equipment: { sound: true, micCount: 2, micType: 'ไมค์ลอย', projector: true, laptop: true, internet: true },
          additionalServices: { water: true, waterTime: '12:45', coffee: true },
          dressCode: '👔 แต่งกายชุดสุภาพ',
          status: 'approved'
        },
        {
          requesterName: 'นางวิมล แก้วใส',
          requesterPhone: '081-300-3003',
          requesterDept: 'สำนักปลัด',
          roomId: R('ห้องมณีจันทรา'),
          date: '2026-03-28',
          startTime: '09:00', endTime: '10:30',
          purpose: '📋 ประชุมพิจารณาร่างข้อบัญญัติท้องถิ่น',
          activity: '🏛️ ประชุมร่างข้อบัญญัติ',
          attendees: 10, roomLayout: 'conference',
          equipment: { whiteboard: true, flipchart: true },
          status: 'cancelled',
          adminNote: '❌ ยกเลิก — เลื่อนนัดตามคำสั่งผู้บริหาร'
        },

        // ─── ห้องพระพุทธสัมฤทธิ์โกสีย์ ─────────────────────────────────────
        {
          requesterName: 'นายประสิทธิ์ ชูศักดิ์',
          requesterPhone: '089-400-4004',
          requesterDept: 'สำนักปลัด',
          roomId: R('ห้องพระพุทธสัมฤทธิ์โกสีย์'),
          date: '2026-03-27',
          startTime: '09:00', endTime: '12:00',
          purpose: '🏛️ การประชุมสภาเทศบาลตำบลบ้านคลอง สมัยสามัญ ครั้งที่ 1/2569',
          activity: '🏛️ ประชุมสภาเทศบาล',
          attendees: 20, roomLayout: 'theater',
          setupBefore: 30, cleanupAfter: 30,
          equipment: { sound: true, micCount: 6, micType: 'ไมค์ตั้งโต๊ะ', projector: true, videoConference: true, internet: true },
          additionalServices: { water: true, waterTime: '08:30', nameCards: true, signage: true },
          dressCode: '👔 แต่งกายชุดเครื่องแบบหรือชุดสุภาพ',
          restrictions: '🚫 ห้ามนำอาหารเข้าห้องประชุม',
          status: 'approved',
          adminNote: '✅ อนุมัติแล้ว — เตรียมป้ายชื่อสมาชิกสภา 20 ชุด'
        },
        {
          requesterName: 'นางสาวจิรา ลาภมาก',
          requesterPhone: '085-500-5005',
          requesterDept: 'กองยุทธศาสตร์และงบประมาณ',
          roomId: R('ห้องพระพุทธสัมฤทธิ์โกสีย์'),
          date: '2026-03-28',
          startTime: '13:00', endTime: '16:00',
          purpose: '📢 แถลงข่าวเปิดตัวโครงการพัฒนาระบบสาธารณูปโภค ปี 2569',
          activity: '🎥 แถลงข่าวโครงการ',
          attendees: 15, roomLayout: 'theater',
          setupBefore: 60,
          equipment: { sound: true, micCount: 3, micType: 'ไมค์ไร้สาย', projector: true, tv: true, internet: true },
          additionalServices: { water: true, waterTime: '12:30', signage: true },
          restrictions: '📸 มีสื่อมวลชนเข้าร่วม',
          status: 'approved'
        },
        {
          requesterName: 'นายกมล สุขใจ',
          requesterPhone: '086-600-6006',
          requesterDept: 'กองการศึกษา',
          roomId: R('ห้องพระพุทธสัมฤทธิ์โกสีย์'),
          date: '2026-04-02',
          startTime: '09:00', endTime: '17:00',
          purpose: '💼 อบรมพัฒนาศักยภาพบุคลากรด้านการจัดการสาธารณะ',
          activity: '🎓 อบรมบุคลากร ประจำปี 2569',
          attendees: 20, roomLayout: 'classroom',
          setupBefore: 30, cleanupAfter: 30,
          equipment: { sound: true, micCount: 2, micType: 'ไมค์ลอย', projector: true, laptop: true, whiteboard: true, flipchart: true, internet: true },
          additionalServices: { water: true, waterTime: '08:30', coffee: true, nameCards: true },
          dressCode: '👕 ชุดสุภาพ',
          status: 'approved'
        },

        // ─── ห้องชัยบุรี ─────────────────────────────────────────────────────
        {
          requesterName: 'นายแพทย์อนันต์ รักสุข',
          requesterPhone: '082-700-7007',
          requesterDept: 'กองสาธารณสุขและสิ่งแวดล้อม',
          roomId: R('ห้องชัยบุรี'),
          date: '2026-03-26',
          startTime: '08:30', endTime: '10:00',
          purpose: '🩺 ประชุมกองสาธารณสุขและสิ่งแวดล้อม เรื่องแผนรณรงค์โรคไข้เลือดออก',
          activity: '🦟 ประชุมแผนป้องกันโรค',
          attendees: 8, roomLayout: 'conference',
          equipment: { whiteboard: true, projector: true },
          additionalServices: { water: true, waterTime: '08:15' },
          status: 'approved'
        },
        {
          requesterName: 'นางสมฤทัย คำพา',
          requesterPhone: '083-800-8008',
          requesterDept: 'สำนักปลัด',
          roomId: R('ห้องชัยบุรี'),
          date: '2026-03-27',
          startTime: '10:00', endTime: '12:00',
          purpose: '🤝 ประชุมพบปะประชาชนรับฟังความเห็นโครงการก่อสร้าง',
          activity: '🏘️ พบประชาชน/รับฟังความเห็น',
          attendees: 15, roomLayout: 'ushape',
          equipment: { flipchart: true, whiteboard: true, sound: true, micCount: 1, micType: 'ไมค์มือถือ' },
          additionalServices: { water: true, waterTime: '09:45' },
          status: 'approved'
        },
        {
          requesterName: 'นายชัยชนะ บุญยิ่ง',
          requesterPhone: '084-900-9009',
          requesterDept: 'กองช่าง',
          roomId: R('ห้องชัยบุรี'),
          date: '2026-03-31',
          startTime: '13:00', endTime: '16:00',
          purpose: '🏘️ กิจกรรมชุมชนสัมพันธ์ แลกเปลี่ยนเรียนรู้ชุมชนบ้านคลอง',
          activity: '🎊 กิจกรรมชุมชน',
          attendees: 20, roomLayout: 'banquet',
          setupBefore: 30,
          equipment: { sound: true, micCount: 2, micType: 'ไมค์ลอย', laptop: true, internet: true },
          additionalServices: { water: true, waterTime: '12:45', coffee: true },
          status: 'approved'
        },

        // ─── ห้องประชุมสารสนเทศ ──────────────────────────────────────────────
        {
          requesterName: 'นายปิยะ ดิจิทัล',
          requesterPhone: '091-010-1010',
          requesterDept: 'ศูนย์ข้อมูลข่าวสาร',
          roomId: R('ห้องประชุมสารสนเทศ'),
          date: '2026-03-27',
          startTime: '14:00', endTime: '16:00',
          purpose: '🎥 ถ่ายทอดสด Live YouTube เปิดตัวระบบจองห้องประชุมออนไลน์',
          activity: '📡 Live streaming / ออนไลน์',
          attendees: 5, roomLayout: 'conference',
          setupBefore: 60,
          equipment: { videoConference: true, internet: true, laptop: true, tv: true },
          additionalServices: { water: true, waterTime: '13:45' },
          restrictions: '🔇 ห้ามส่งเสียงรบกวนระหว่าง Live',
          status: 'approved',
          adminNote: '✅ อนุมัติแล้ว — ตรวจสอบสัญญาณอินเทอร์เน็ตก่อน 14:00'
        },
        {
          requesterName: 'นางสาวพัชรี โค้ดดี้',
          requesterPhone: '092-011-1011',
          requesterDept: 'ศูนย์ข้อมูลข่าวสาร',
          roomId: R('ห้องประชุมสารสนเทศ'),
          date: '2026-03-28',
          startTime: '09:00', endTime: '12:00',
          purpose: '💻 ประชุมทีมพัฒนาระบบดิจิทัลเทศบาล ครั้งที่ 2/2569',
          activity: '🖥️ ประชุมทีมดิจิทัล',
          attendees: 8, roomLayout: 'conference',
          equipment: { projector: true, internet: true, whiteboard: true, laptop: true },
          additionalServices: { water: true, waterTime: '08:45', coffee: true },
          status: 'approved'
        },

        // ─── อาคารเอนกประสงค์ ────────────────────────────────────────────────
        {
          requesterName: 'นายสรศักดิ์ ชุมชนดี',
          requesterPhone: '093-012-1012',
          requesterDept: 'กองสวัสดิการสังคม',
          roomId: R('อาคารเอนกประสงค์'),
          date: '2026-03-29',
          startTime: '07:00', endTime: '17:00',
          purpose: '⚽ กีฬาชุมชนสัมพันธ์ ประจำปี 2569 เทศบาลตำบลบ้านคลอง',
          activity: '🏆 วันกีฬาชุมชน',
          attendees: 200, roomLayout: 'other',
          setupBefore: 60, cleanupAfter: 60,
          equipment: { sound: true, micCount: 4, micType: 'ไมค์ลอย+ตั้งโต๊ะ', projector: true, internet: true },
          additionalServices: { water: true, waterTime: '06:30', signage: true, extraArea: 'ลานจอดรถด้านหน้า' },
          dressCode: '👕 ชุดกีฬาสี',
          status: 'approved',
          adminNote: '✅ อนุมัติแล้ว — ประสานงานกองช่างติดตั้งเวที 1 วันก่อน'
        },
        {
          requesterName: 'นางลัดดา มงคลชัย',
          requesterPhone: '094-013-1013',
          requesterDept: 'สำนักปลัด',
          roomId: R('อาคารเอนกประสงค์'),
          date: '2026-04-05',
          startTime: '08:00', endTime: '16:00',
          purpose: '🎖️ ซ้อมพิธีส่งมอบงานโครงการพัฒนาโครงสร้างพื้นฐาน',
          activity: '🎪 ซ้อมพิธี/งานพิธีการ',
          attendees: 50, roomLayout: 'theater',
          setupBefore: 120, cleanupAfter: 60,
          equipment: { sound: true, micCount: 3, micType: 'ไมค์ไร้สาย', projector: true, laptop: true },
          additionalServices: { water: true, waterTime: '07:30', nameCards: true, signage: true, coffee: true },
          dressCode: '👗 แต่งกายชุดเครื่องแบบราชการ',
          status: 'approved'
        }
      ];

      let created = 0;
      for (const b of MOCK_BOOKINGS) {
        if (!b.roomId) {
          console.warn(`⚠️ ไม่พบห้อง สำหรับ "${b.purpose.substring(0, 30)}" — ข้าม`);
          continue;
        }
        await Booking.create(b);
        created++;
      }
      console.log(`✅ Seeded ${created} mock bookings`);
    }

    console.log('\n🎉 Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
