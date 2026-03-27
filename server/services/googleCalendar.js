// Google Calendar Integration Service
// รองรับ 2 วิธีล็อกอิน: Service Account (แนะนำ) หรือ OAuth2 Refresh Token
// calendarId: cvq6279kfec56nnmsa90sq16vc@group.calendar.google.com

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'cvq6279kfec56nnmsa90sq16vc@group.calendar.google.com';
const TZ = 'Asia/Bangkok';

const EQUIP_LABELS = {
  sound: 'เครื่องเสียง', projector: 'โปรเจคเตอร์', tv: 'จอทีวี/จอภาพ',
  laptop: 'โน้ตบุ๊ก', whiteboard: 'ไวท์บอร์ด', flipchart: 'ฟลิปชาร์ต',
  videoConference: 'วิดีโอคอนเฟอเรนซ์', internet: 'อินเทอร์เน็ตพิเศษ'
};
const SVC_LABELS = {
  water: 'น้ำดื่ม', coffee: 'กาแฟ/ของว่าง', nameCards: 'ป้ายชื่อ', signage: 'ป้ายไวนิล'
};

class GoogleCalendarService {
  constructor() {
    this.enabled = false;
    this.calendar = null;
    this.CALENDAR_ID = CALENDAR_ID;

    try {
      const { google } = require('googleapis');

      // ─── วิธีที่ 1: Service Account (แนะนำสำหรับ server) ─────────────────────
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        this.calendar = google.calendar({ version: 'v3', auth });
        this.enabled = true;
        console.log('📅 Google Calendar: Connected via Service Account');

        // ─── วิธีที่ 2: OAuth2 Refresh Token ────────────────────────────────────
      } else if (
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REFRESH_TOKEN
      ) {
        const auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000'
        );
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        this.calendar = google.calendar({ version: 'v3', auth });
        this.enabled = true;
        console.log('📅 Google Calendar: Connected via OAuth2');

      } else {
        console.log('📅 Google Calendar: Simulated mode (set GOOGLE_SERVICE_ACCOUNT_JSON หรือ GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN ใน .env)');
      }
    } catch (err) {
      console.error('📅 Google Calendar init error:', err.message);
    }
  }

  // ─── สร้าง description จากข้อมูลการจอง ──────────────────────────────────
  _buildDescription(booking, roomDoc) {
    const eq = booking.equipment || {};
    const svc = booking.additionalServices || {};
    const eqList = Object.entries(EQUIP_LABELS).filter(([k]) => eq[k]).map(([, v]) => v);
    const svcList = Object.entries(SVC_LABELS).filter(([k]) => svc[k]).map(([, v]) => v);
    const appUrl = process.env.APP_URL || 'http://localhost:5173';

    let d = '📋 รายละเอียดการจองห้องประชุม\n';
    d += '━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    d += `👤 ผู้จอง    : ${booking.requesterName || ''}\n`;
    if (booking.requesterDept) d += `🏢 หน่วยงาน  : ${booking.requesterDept}\n`;
    d += `📞 เบอร์โทร  : ${booking.requesterPhone || ''}\n`;
    d += '\n';
    d += `🚪 ห้อง      : ${roomDoc?.name || ''}\n`;
    if (roomDoc?.floor) d += `📍 สถานที่   : ชั้น ${roomDoc.floor}${roomDoc.location ? ` ${roomDoc.location}` : ''}\n`;
    d += `📅 วันที่    : ${booking.date}\n`;
    d += `⏰ เวลา      : ${booking.startTime}–${booking.endTime} น.\n`;
    if (booking.attendees > 0) d += `👥 ผู้เข้าร่วม: ${booking.attendees} คน\n`;
    if (booking.roomLayout) d += `🪑 รูปแบบห้อง: ${booking.roomLayout}\n`;
    d += '\n';
    d += `📝 วัตถุประสงค์: ${booking.purpose}\n`;
    if (booking.activity) d += `🎯 กิจกรรม    : ${booking.activity}\n`;
    if (booking.dressCode) d += `👗 การแต่งกาย : ${booking.dressCode}\n`;
    if (booking.restrictions) d += `⚠️ ข้อห้าม    : ${booking.restrictions}\n`;
    if (eqList.length > 0) {
      d += '\n';
      d += `🔧 อุปกรณ์    : ${eqList.join(', ')}\n`;
      if (eq.sound && eq.micCount > 0) d += `   ไมโครโฟน  : ${eq.micCount} ตัว${eq.micType ? ` (${eq.micType})` : ''}\n`;
      if (eq.other) d += `   อื่นๆ     : ${eq.other}\n`;
    }
    if (svcList.length > 0) {
      if (eqList.length === 0) d += '\n';
      d += `�️ บริการเพิ่ม : ${svcList.join(', ')}\n`;
      if (svc.water && svc.waterTime) d += `   เสิร์ฟ   : ${svc.waterTime}\n`;
      if (svc.extraArea) d += `   พื้นที่  : ${svc.extraArea}\n`;
    }
    d += '\n';
    d += `📌 สถานะ     : ${booking.status}\n`;
    d += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    d += `🔗 ${appUrl}/dashboard`;
    return d;
  }

  // ─── สร้าง event resource ─────────────────────────────────────────────────
  _buildEventResource(booking, roomDoc) {
    const roomName = roomDoc?.name || '';
    const roomIcon = roomDoc?.icon || '🏢';
    const floor = roomDoc?.floor ? `ชั้น ${roomDoc.floor}` : '';
    const location = roomDoc?.location ? `${roomDoc.location} ${floor}` : floor || roomName;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const startDT = `${booking.date}T${booking.startTime}:00+07:00`;
    const endDT = `${booking.date}T${booking.endTime}:00+07:00`;

    const resource = {
      summary: `${roomIcon} ${roomName} — ${booking.purpose}`,
      description: this._buildDescription(booking, roomDoc),
      location: location || roomName,
      start: { dateTime: startDT, timeZone: TZ },
      end: { dateTime: endDT, timeZone: TZ },
      source: {
        title: 'ระบบจองห้องประชุม เทศบาลตำบลบ้านคลอง',
        url: `${appUrl}/dashboard`
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 15 }]
      }
    };
    return resource;
  }

  // ─── สร้าง event ใหม่ ─────────────────────────────────────────────────────
  async createEvent(booking, roomDoc) {
    if (!this.enabled) {
      const fakeId = `sim_${Date.now()}`;
      console.log(`📅 [Sim] createEvent → ${fakeId}`);
      return { eventId: fakeId, simulated: true };
    }
    try {
      const res = await this.calendar.events.insert({
        calendarId: this.CALENDAR_ID,
        resource: this._buildEventResource(booking, roomDoc)
      });
      console.log(`📅 Created event: ${res.data.id}`);
      return { eventId: res.data.id, simulated: false };
    } catch (err) {
      console.error('📅 createEvent error:', err.message);
      return { eventId: null, error: err.message };
    }
  }

  // ─── อัปเดต event ที่มีอยู่ ────────────────────────────────────────────────
  async updateEvent(eventId, booking, roomDoc) {
    if (!this.enabled || !eventId || eventId.startsWith('sim_')) {
      console.log(`📅 [Sim] updateEvent → ${eventId}`);
      return { success: true, simulated: true };
    }
    try {
      const res = await this.calendar.events.update({
        calendarId: this.CALENDAR_ID,
        eventId,
        resource: this._buildEventResource(booking, roomDoc)
      });
      console.log(`📅 Updated event: ${res.data.id}`);
      return { success: true, eventId: res.data.id, simulated: false };
    } catch (err) {
      console.error('📅 updateEvent error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── ลบ event ────────────────────────────────────────────────────────────
  async deleteEvent(eventId) {
    if (!this.enabled || !eventId || eventId.startsWith('sim_')) {
      console.log(`📅 [Sim] deleteEvent → ${eventId}`);
      return { success: true, simulated: true };
    }
    try {
      await this.calendar.events.delete({
        calendarId: this.CALENDAR_ID,
        eventId
      });
      console.log(`📅 Deleted event: ${eventId}`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error('📅 deleteEvent error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new GoogleCalendarService();
