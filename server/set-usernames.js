require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const User = require('./models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Set username for admin
  const admin = await User.findOneAndUpdate(
    { email: 'admin@meeting.com' },
    { username: 'admin' },
    { new: true }
  );
  console.log(admin ? `✅ Set username 'admin' for ${admin.email}` : '⚠️ Admin not found');

  // Set username for demo user
  const demoUser = await User.findOneAndUpdate(
    { email: 'user@meeting.com' },
    { username: 'user' },
    { new: true }
  );
  console.log(demoUser ? `✅ Set username 'user' for ${demoUser.email}` : '⚠️ Demo user not found');

  console.log('\n🎉 Done!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
