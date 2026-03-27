const fetch = require('node-fetch');

const API = 'http://127.0.0.1:5001/api';
let passed = 0;
let failed = 0;

function ok(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else       { console.error(`  ❌ ${label}${detail ? ' – ' + detail : ''}`); failed++; }
}

async function run() {
  console.log('\n═══════════════════════════════════════');
  console.log(' 🧪  Integration Test  (MOCK MODE)     ');
  console.log('═══════════════════════════════════════\n');

  // ── Health ─────────────────────────────────────────────────────────
  console.log('1️⃣  Health check');
  const h = await fetch(`${API}/health`).then(r => r.json());
  ok('Server is healthy', h.status === 'healthy');
  ok('Initial cache empty', h.cachedBookings === 0, `got ${h.cachedBookings}`);

  // ── Rooms ───────────────────────────────────────────────────────────
  console.log('\n2️⃣  Rooms list');
  const rooms = await fetch(`${API}/rooms`).then(r => r.json());
  ok('Returns ok:true',  rooms.ok === true);
  ok('Has 5 rooms',      rooms.rooms.length === 5, `got ${rooms.rooms.length}`);

  // ── Create booking ──────────────────────────────────────────────────
  console.log('\n3️⃣  Create booking (09:00 – 11:00)');
  const bRes = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'สมชาย ใจดี', phone: '081-234-5678',
      room: 'ห้องมณีจันทรา', date: '2026-04-01',
      startTime: '09:00', endTime: '11:00', purpose: 'ประชุมแผนงาน'
    })
  }).then(r => r.json());
  ok('Returns ok:true',          bRes.ok === true, bRes.message);
  ok('Status = confirmed',       bRes.booking?.status === 'confirmed');
  ok('ID starts with bk_',       bRes.booking?.id?.startsWith('bk_'));
  const bookingId = bRes.booking?.id;

  // ── Overlap prevention ──────────────────────────────────────────────
  console.log('\n4️⃣  Overlap prevention (10:00 – 12:00)');
  const ov = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'มานะ อดทน', phone: '089-000-0000',
      room: 'ห้องมณีจันทรา', date: '2026-04-01',
      startTime: '10:00', endTime: '12:00', purpose: 'ซ้อนทับ'
    })
  }).then(r => r.json());
  ok('Returns ok:false (409)',    ov.ok === false);
  ok('Thai error message',       ov.message?.includes('ถูกจองแล้ว'));

  // ── Max-4h validation ───────────────────────────────────────────────
  console.log('\n5️⃣  Validation – over 4 hours (rejected)');
  const maxH = await fetch(`${API}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test', phone: '000-000-0000',
      room: 'ห้องชัยบุรี', date: '2026-04-02',
      startTime: '08:00', endTime: '14:00', purpose: 'เกิน 4 ชั่วโมง'
    })
  }).then(r => r.json());
  ok('Returns ok:false (>4h)',    maxH.ok === false);
  ok('Thai error message',       maxH.errors?.some(e => e.includes('4 ชั่วโมง')));

  // ── Availability check ──────────────────────────────────────────────
  console.log('\n6️⃣  Availability check');
  const busyRoom = encodeURIComponent('ห้องมณีจันทรา');
  const avBusy = await fetch(`${API}/bookings/check-availability?room=${busyRoom}&date=2026-04-01&startTime=09:30&endTime=10:30`).then(r => r.json());
  ok('Slot 09:30-10:30 is busy',   avBusy.available === false);

  const avFree = await fetch(`${API}/bookings/check-availability?room=${busyRoom}&date=2026-04-01&startTime=11:00&endTime=13:00`).then(r => r.json());
  ok('Slot 11:00-13:00 is free',   avFree.available === true);

  // ── Booking list ─────────────────────────────────────────────────────
  console.log('\n7️⃣  Booking list + filter');
  const list = await fetch(`${API}/bookings`).then(r => r.json());
  ok('Has 1 confirmed booking',    list.bookings.filter(b => b.status === 'confirmed').length === 1);

  const filtered = await fetch(`${API}/bookings?date=2026-04-01`).then(r => r.json());
  ok('Filter by date works',       filtered.bookings.length === 1);

  // ── Cancel booking ────────────────────────────────────────────────────
  console.log('\n8️⃣  Cancel booking');
  const cancel = await fetch(`${API}/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json());
  ok('Returns ok:true',            cancel.ok === true, cancel.message);
  ok('Status = cancelled',         cancel.booking?.status === 'cancelled');

  const cancelAgain = await fetch(`${API}/bookings/${bookingId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json());
  ok('Double-cancel rejected',     cancelAgain.ok === false);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(` Result: ${passed} passed, ${failed} failed `);
  console.log('═══════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('💥 Test script error:', err.message);
  process.exit(1);
});
