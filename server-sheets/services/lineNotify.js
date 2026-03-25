/**
 * LINE Notify Service
 * Sends Thai-language notifications for booking events.
 * Gracefully degrades to simulated mode if no token is set.
 */

const fetch = require('node-fetch');

const LINE_API = 'https://notify-api.line.me/api/notify';

function isEnabled() {
  return !!process.env.LINE_NOTIFY_TOKEN;
}

async function send(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) {
    console.log(`💬 [LINE Simulated] ${message.slice(0, 60)}...`);
    return { ok: true, simulated: true };
  }

  try {
    const res = await fetch(LINE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: `message=${encodeURIComponent(message)}`
    });
    const json = await res.json();
    const ok = json.status === 200;
    console.log(`💬 LINE Notify: ${ok ? 'sent' : 'failed – ' + json.message}`);
    return { ok, simulated: false };
  } catch (err) {
    console.error(`💬 LINE error: ${err.message}`);
    return { ok: false, simulated: false, error: err.message };
  }
}

// ─── Pre-built Thai message templates ────────────────────────────────────────

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function formatDateTH(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

async function notifyCreated(booking) {
  const msg = [
    '',
    '📋 การจองห้องประชุมใหม่',
    `🏢 ห้อง: ${booking.room}`,
    `👤 ผู้จอง: ${booking.name}`,
    `📞 โทร: ${booking.phone}`,
    `📅 วันที่: ${formatDateTH(booking.date)}`,
    `⏰ เวลา: ${booking.startTime} – ${booking.endTime} น.`,
    `📝 วัตถุประสงค์: ${booking.purpose}`,
    `🔑 รหัสการจอง: ${booking.id}`
  ].join('\n');
  return send(msg);
}

async function notifyCancelled(booking) {
  const msg = [
    '',
    '❌ ยกเลิกการจองห้องประชุม',
    `🏢 ห้อง: ${booking.room}`,
    `👤 ผู้จอง: ${booking.name}`,
    `📅 วันที่: ${formatDateTH(booking.date)}`,
    `⏰ เวลา: ${booking.startTime} – ${booking.endTime} น.`
  ].join('\n');
  return send(msg);
}

module.exports = { send, notifyCreated, notifyCancelled, isEnabled };
