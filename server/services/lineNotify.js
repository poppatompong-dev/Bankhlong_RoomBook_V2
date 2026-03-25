// LINE Notify Integration Service
// Gracefully degrades when token is not configured

const fetch = require('node-fetch');

class LineNotifyService {
  constructor() {
    this.token = process.env.LINE_NOTIFY_TOKEN;
    this.enabled = !!this.token;
    this.apiUrl = 'https://notify-api.line.me/api/notify';

    if (this.enabled) {
      console.log('💬 LINE Notify: Connected');
    } else {
      console.log('💬 LINE Notify: Running in simulated mode (no token)');
    }
  }

  async send(message) {
    if (!this.enabled) {
      console.log(`💬 [Simulated] LINE: ${message}`);
      return { success: true, simulated: true };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${this.token}`
        },
        body: `message=${encodeURIComponent(message)}`
      });

      const data = await response.json();
      if (data.status === 200) {
        console.log('💬 LINE notification sent successfully');
        return { success: true, simulated: false };
      } else {
        console.error('💬 LINE notification failed:', data.message);
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error('💬 LINE notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Pre-built notification templates (Thai)
  async notifyBookingCreated(booking, room, user) {
    const msg = `\n🏢 มีการจองห้องประชุมใหม่\n📋 ห้อง: ${room.name}\n👤 ผู้จอง: ${user.name}\n📅 วันที่: ${booking.date}\n⏰ เวลา: ${booking.startTime} - ${booking.endTime}\n📝 วัตถุประสงค์: ${booking.purpose}\n🔄 สถานะ: รอการอนุมัติ`;
    return this.send(msg);
  }

  async notifyBookingApproved(booking, room, user) {
    const msg = `\n✅ อนุมัติการจองห้องประชุม\n📋 ห้อง: ${room.name}\n👤 ผู้จอง: ${user.name}\n📅 วันที่: ${booking.date}\n⏰ เวลา: ${booking.startTime} - ${booking.endTime}`;
    return this.send(msg);
  }

  async notifyBookingCancelled(booking, room, user) {
    const msg = `\n❌ ยกเลิกการจองห้องประชุม\n📋 ห้อง: ${room.name}\n👤 ผู้จอง: ${user.name}\n📅 วันที่: ${booking.date}\n⏰ เวลา: ${booking.startTime} - ${booking.endTime}`;
    return this.send(msg);
  }
}

module.exports = new LineNotifyService();
