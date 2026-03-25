/**
 * Google Sheets Service
 * - Authenticates via Service Account
 * - In-memory cache with 5-10 second TTL
 * - Read, append, and update rows
 *
 * Sheet schema (columns A–J):
 *   id | name | phone | room | date | startTime | endTime | purpose | status | createdAt
 */

const { google } = require('googleapis');

// ─── Column map ────────────────────────────────────────────────────────────
const COL = {
  id: 0,
  name: 1,
  phone: 2,
  room: 3,
  date: 4,
  startTime: 5,
  endTime: 6,
  purpose: 7,
  status: 8,
  createdAt: 9
};
const HEADERS = ['id', 'name', 'phone', 'room', 'date', 'startTime', 'endTime', 'purpose', 'status', 'createdAt'];

// ─── Cache ─────────────────────────────────────────────────────────────────
let _cache = {
  data: [],          // array of booking objects
  lastFetched: 0,    // timestamp ms
  ttl: 7000          // 7 seconds
};

let _sheetsAuth = null;
let _sheetsClient = null;
let _calendarClient = null;

// ─── Authentication ─────────────────────────────────────────────────────────
function getAuth() {
  if (process.env.MOCK_DATABASE === 'true') return null;
  if (_sheetsAuth) return _sheetsAuth;

  let credentials;

  // Try inline JSON first (env var)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  } else {
    // Fall back to key file path
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './service-account.json';
    try {
      credentials = require('fs').existsSync(keyFile)
        ? JSON.parse(require('fs').readFileSync(keyFile, 'utf8'))
        : null;
    } catch (e) {
      credentials = null;
    }
  }

  if (!credentials) {
    throw new Error(
      'Google Service Account credentials not found.\n' +
      'Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_FILE in .env'
    );
  }

  _sheetsAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar'
    ]
  });

  return _sheetsAuth;
}

function getSheetsClient() {
  if (!_sheetsClient) {
    _sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
  }
  return _sheetsClient;
}

function getCalendarClient() {
  if (!_calendarClient) {
    _calendarClient = google.calendar({ version: 'v3', auth: getAuth() });
  }
  return _calendarClient;
}

// ─── Row <-> Object conversions ─────────────────────────────────────────────
function rowToBooking(row) {
  if (!row || row.length === 0) return null;
  // Pad row to 10 columns
  while (row.length < 10) row.push('');
  return {
    id: row[COL.id],
    name: row[COL.name],
    phone: row[COL.phone],
    room: row[COL.room],
    date: row[COL.date],
    startTime: row[COL.startTime],
    endTime: row[COL.endTime],
    purpose: row[COL.purpose],
    status: row[COL.status] || 'confirmed',
    createdAt: row[COL.createdAt]
  };
}

function bookingToRow(booking) {
  return [
    booking.id,
    booking.name,
    booking.phone,
    booking.room,
    booking.date,
    booking.startTime,
    booking.endTime,
    booking.purpose,
    booking.status,
    booking.createdAt
  ];
}

// ─── Sheet initialization (ensure header row) ───────────────────────────────
async function ensureHeaders() {
  if (process.env.MOCK_DATABASE === 'true') {
    console.log('✅ [MOCK] Sheet headers initialized');
    return;
  }
  const sheets = getSheetsClient();
  const range = `${process.env.SHEET_NAME}!A1:J1`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range
  });

  const existing = res.data.values?.[0] || [];
  if (existing[0] !== 'id') {
    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });
    console.log('✅ Sheet headers initialized');
  }
}

// ─── Read all rows (with cache) ─────────────────────────────────────────────
async function getAllBookings(forceRefresh = false) {
  const now = Date.now();

  if (process.env.MOCK_DATABASE === 'true') {
    _cache.lastFetched = now;
    return _cache.data;
  }

  if (!forceRefresh && _cache.data.length >= 0 && (now - _cache.lastFetched) < _cache.ttl) {
    return _cache.data;
  }

  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${process.env.SHEET_NAME}!A:J`
    });

    const rows = res.data.values || [];
    // Skip header row (row 0)
    const bookings = rows
      .slice(1)
      .map(rowToBooking)
      .filter(b => b && b.id); // skip empty rows

    _cache.data = bookings;
    _cache.lastFetched = now;

    console.log(`📊 Refreshed cache: ${bookings.length} bookings`);
    return bookings;
  } catch (error) {
    console.error('❌ Error reading sheet:', error.message);
    // Return stale cache if available
    if (_cache.data.length > 0) {
      console.log('⚠️ Using stale cache');
      return _cache.data;
    }
    throw error;
  }
}

// ─── Invalidate cache ────────────────────────────────────────────────────────
function invalidateCache() {
  _cache.lastFetched = 0;
}

// ─── Append a new booking row ────────────────────────────────────────────────
async function appendBooking(booking) {
  if (process.env.MOCK_DATABASE === 'true') {
    _cache.data.push(booking);
    console.log(`✅ [MOCK] Appended booking: ${booking.id}`);
    return booking;
  }
  const sheets = getSheetsClient();
  const row = bookingToRow(booking);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: `${process.env.SHEET_NAME}!A:J`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] }
  });

  // Add to local cache immediately
  _cache.data.push(booking);

  console.log(`✅ Appended booking: ${booking.id}`);
  return booking;
}

// ─── Find row number for a booking ID ───────────────────────────────────────
async function findRowNumber(bookingId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `${process.env.SHEET_NAME}!A:A` // only id column
  });

  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) { // skip header
    if (rows[i][0] === bookingId) return i + 1; // 1-indexed row number
  }
  return null;
}

// ─── Update status of a booking ─────────────────────────────────────────────
async function updateBookingStatus(bookingId, newStatus) {
  if (process.env.MOCK_DATABASE === 'true') {
    const idx = _cache.data.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      _cache.data[idx].status = newStatus;
      console.log(`✅ [MOCK] Updated booking ${bookingId} status → ${newStatus}`);
      return idx + 2;
    }
    throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);
  }
  const rowNum = await findRowNumber(bookingId);
  if (!rowNum) throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);

  const sheets = getSheetsClient();
  const statusCol = 'I'; // column I = status (index 8, A=1)

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `${process.env.SHEET_NAME}!${statusCol}${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newStatus]] }
  });

  // Update cache
  const idx = _cache.data.findIndex(b => b.id === bookingId);
  if (idx !== -1) _cache.data[idx].status = newStatus;

  console.log(`✅ Updated booking ${bookingId} status → ${newStatus}`);
  return rowNum;
}

// ─── Conflict detection ──────────────────────────────────────────────────────
function timeDiffMinutes(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function hasOverlap(booking, room, date, startTime, endTime, excludeId = null) {
  return booking.room === room &&
    booking.date === date &&
    booking.status !== 'cancelled' &&
    booking.id !== excludeId &&
    booking.startTime < endTime &&
    booking.endTime > startTime;
}

function findConflicts(bookings, room, date, startTime, endTime, excludeId = null) {
  return bookings.filter(b => hasOverlap(b, room, date, startTime, endTime, excludeId));
}

// ─── Google Calendar ─────────────────────────────────────────────────────────
async function createCalendarEvent(booking) {
  try {
    const calendar = getCalendarClient();
    const event = {
      summary: `🏢 ${booking.room} – ${booking.purpose}`,
      description: `ผู้จอง: ${booking.name}\nเบอร์โทร: ${booking.phone}\nวัตถุประสงค์: ${booking.purpose}`,
      start: {
        dateTime: `${booking.date}T${booking.startTime}:00+07:00`,
        timeZone: 'Asia/Bangkok'
      },
      end: {
        dateTime: `${booking.date}T${booking.endTime}:00+07:00`,
        timeZone: 'Asia/Bangkok'
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 15 }]
      }
    };

    const res = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event
    });

    console.log(`📅 Calendar event created: ${res.data.id}`);
    return res.data.id;
  } catch (error) {
    console.log(`📅 Calendar (simulated – ${error.message})`);
    return `sim_${Date.now()}`;
  }
}

async function deleteCalendarEvent(eventId) {
  if (!eventId || eventId.startsWith('sim_')) {
    console.log(`📅 Calendar delete skipped (simulated id)`);
    return;
  }
  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId
    });
    console.log(`📅 Calendar event deleted: ${eventId}`);
  } catch (error) {
    console.log(`📅 Calendar delete failed: ${error.message}`);
  }
}

// ─── Update full booking row ─────────────────────────────────────────────────
async function updateBooking(bookingId, fields) {
  if (process.env.MOCK_DATABASE === 'true') {
    const idx = _cache.data.findIndex(b => b.id === bookingId);
    if (idx === -1) throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);
    _cache.data[idx] = { ..._cache.data[idx], ...fields };
    console.log(`✅ [MOCK] Updated booking ${bookingId}`);
    return _cache.data[idx];
  }
  const rowNum = await findRowNumber(bookingId);
  if (!rowNum) throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);

  const idx = _cache.data.findIndex(b => b.id === bookingId);
  const existing = idx !== -1 ? _cache.data[idx] : {};
  const updated = { ...existing, ...fields, id: bookingId };

  const row = bookingToRow(updated);
  const sheetsClient = getSheetsClient();
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `${process.env.SHEET_NAME}!A${rowNum}:J${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });

  if (idx !== -1) _cache.data[idx] = updated;
  console.log(`✅ Updated booking ${bookingId}`);
  return updated;
}

// ─── Delete a booking row ─────────────────────────────────────────────────────
async function deleteBooking(bookingId) {
  if (process.env.MOCK_DATABASE === 'true') {
    const idx = _cache.data.findIndex(b => b.id === bookingId);
    if (idx === -1) throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);
    _cache.data.splice(idx, 1);
    console.log(`✅ [MOCK] Deleted booking ${bookingId}`);
    return true;
  }
  const rowNum = await findRowNumber(bookingId);
  if (!rowNum) throw new Error(`การจอง ${bookingId} ไม่พบในระบบ`);

  const sheetsClient = getSheetsClient();
  const spreadsheetId = process.env.SHEET_ID;

  const metaRes = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const sheet = metaRes.data.sheets.find(s => s.properties.title === process.env.SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต');

  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowNum - 1,
            endIndex: rowNum
          }
        }
      }]
    }
  });

  const idx = _cache.data.findIndex(b => b.id === bookingId);
  if (idx !== -1) _cache.data.splice(idx, 1);
  console.log(`✅ Deleted booking ${bookingId}`);
  return true;
}

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
  ensureHeaders,
  getAllBookings,
  appendBooking,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  findConflicts,
  timeDiffMinutes,
  invalidateCache,
  createCalendarEvent,
  deleteCalendarEvent
};
