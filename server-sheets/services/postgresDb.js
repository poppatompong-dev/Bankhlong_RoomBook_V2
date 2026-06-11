const { Pool } = require('pg');

const ROOM_COLUMNS = 'id,name,capacity,icon,floor,location,is_active,created_at,updated_at';
const BOOKING_COLUMNS = 'id,name,phone,dept,room,booking_date,start_time,end_time,purpose,status,activity,attendees,equipment,additional_services,metadata,created_at,updated_at';
const ADMIN_USER_COLUMNS = 'id,username,name,role,password_hash,created_at,updated_at';

let pool = null;

function isEnabled() {
  return process.env.MOCK_DATABASE !== 'true' && !!process.env.DATABASE_URL;
}

function getPool() {
  if (!isEnabled()) return null;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const wantsSsl = /sslmode=require/i.test(connectionString) || /neon\.tech/i.test(connectionString);
    pool = new Pool({
      connectionString,
      max: Number(process.env.POSTGRES_POOL_MAX) || 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {})
    });
  }
  return pool;
}

function dateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

function jsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toRoom(row) {
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    capacity: row.capacity,
    icon: row.icon || '🏢',
    floor: row.floor,
    location: row.location,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromRoom(room) {
  return {
    id: room.id,
    name: String(room.name || '').trim(),
    capacity: Number(room.capacity),
    icon: room.icon || '🏢',
    floor: String(room.floor || '').trim(),
    location: room.location || null,
    is_active: room.isActive !== false
  };
}

function mapRoomFields(fields) {
  const mapped = {};
  if (fields.name !== undefined) mapped.name = String(fields.name).trim();
  if (fields.capacity !== undefined) mapped.capacity = Number(fields.capacity);
  if (fields.icon !== undefined) mapped.icon = fields.icon || '🏢';
  if (fields.floor !== undefined) mapped.floor = String(fields.floor).trim();
  if (fields.location !== undefined) mapped.location = fields.location || null;
  if (fields.isActive !== undefined) mapped.is_active = fields.isActive !== false;
  return mapped;
}

function toBooking(row) {
  const metadata = jsonObject(row.metadata);
  return {
    ...metadata,
    id: row.id,
    _id: row.id,
    name: row.name,
    phone: row.phone,
    dept: row.dept || '',
    room: row.room,
    date: dateOnly(row.booking_date),
    startTime: timeOnly(row.start_time),
    endTime: timeOnly(row.end_time),
    purpose: row.purpose,
    status: row.status || 'confirmed',
    activity: row.activity || '',
    attendees: row.attendees || 0,
    equipment: jsonObject(row.equipment),
    additionalServices: jsonObject(row.additional_services),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function bookingMetadata(booking) {
  const known = new Set([
    'id', '_id', 'name', 'phone', 'dept', 'requesterDept', 'room', 'date', 'startTime', 'endTime',
    'purpose', 'status', 'activity', 'attendees', 'equipment', 'additionalServices',
    'additional_services', 'metadata', 'createdAt', 'updatedAt'
  ]);
  const metadata = { ...jsonObject(booking.metadata) };
  Object.entries(booking).forEach(([key, value]) => {
    if (!known.has(key) && value !== undefined) metadata[key] = value;
  });
  return metadata;
}

function fromBooking(booking) {
  return {
    id: booking.id,
    name: String(booking.name || '').trim(),
    phone: String(booking.phone || '').trim(),
    dept: booking.dept || booking.requesterDept || null,
    room: String(booking.room || '').trim(),
    booking_date: booking.date,
    start_time: booking.startTime,
    end_time: booking.endTime,
    purpose: String(booking.purpose || '').trim(),
    status: booking.status || 'confirmed',
    activity: booking.activity || null,
    attendees: Number(booking.attendees) || 0,
    equipment: jsonObject(booking.equipment),
    additional_services: jsonObject(booking.additionalServices || booking.additional_services),
    metadata: bookingMetadata(booking)
  };
}

function mapBookingFields(fields) {
  const mapped = {};
  if (fields.name !== undefined) mapped.name = String(fields.name).trim();
  if (fields.phone !== undefined) mapped.phone = String(fields.phone).trim();
  if (fields.dept !== undefined) mapped.dept = fields.dept || null;
  if (fields.room !== undefined) mapped.room = String(fields.room).trim();
  if (fields.date !== undefined) mapped.booking_date = fields.date;
  if (fields.startTime !== undefined) mapped.start_time = fields.startTime;
  if (fields.endTime !== undefined) mapped.end_time = fields.endTime;
  if (fields.purpose !== undefined) mapped.purpose = String(fields.purpose).trim();
  if (fields.status !== undefined) mapped.status = fields.status;
  if (fields.activity !== undefined) mapped.activity = fields.activity || null;
  if (fields.attendees !== undefined) mapped.attendees = Number(fields.attendees) || 0;
  if (fields.equipment !== undefined) mapped.equipment = jsonObject(fields.equipment);
  if (fields.additionalServices !== undefined) mapped.additional_services = jsonObject(fields.additionalServices);
  const metadata = bookingMetadata(fields);
  if (Object.keys(metadata).length > 0) mapped.metadata = metadata;
  return mapped;
}

function toAdminUser(row, includePasswordHash = false) {
  return {
    id: row.id,
    _id: row.id,
    username: row.username,
    name: row.name,
    role: row.role || 'admin',
    phone: '',
    isActive: true,
    ...(includePasswordHash ? { password_hash: row.password_hash } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromAdminUser(user) {
  return {
    id: user.id || `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    username: String(user.username || '').trim().toLowerCase(),
    name: String(user.name || '').trim(),
    role: user.role || 'admin',
    password_hash: user.passwordHash || user.password_hash || user.password || null
  };
}

function mapAdminUserFields(fields) {
  const mapped = {};
  if (fields.username !== undefined) mapped.username = String(fields.username).trim().toLowerCase();
  if (fields.name !== undefined) mapped.name = String(fields.name).trim();
  if (fields.role !== undefined) mapped.role = fields.role || 'admin';
  if (fields.passwordHash !== undefined) mapped.password_hash = fields.passwordHash;
  if (fields.password_hash !== undefined) mapped.password_hash = fields.password_hash;
  return mapped;
}

function throwIfMissing() {
  if (!getPool()) throw new Error('DATABASE_URL is not configured');
}

async function query(sql, params) {
  throwIfMissing();
  return getPool().query(sql, params);
}

function buildUpdate(table, id, fields, columns) {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return query(`SELECT ${columns} FROM ${table} WHERE id = $1`, [id]);
  }
  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  assignments.push('updated_at = now()');
  const values = [id, ...entries.map(([, value]) => value)];
  return query(
    `UPDATE ${table} SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${columns}`,
    values
  );
}

async function getRooms() {
  const { rows } = await query(`SELECT ${ROOM_COLUMNS} FROM rooms ORDER BY created_at ASC, name ASC`);
  return rows.map(toRoom);
}

async function createRoom(room) {
  const value = fromRoom(room);
  const { rows } = await query(
    `INSERT INTO rooms (id, name, capacity, icon, floor, location, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${ROOM_COLUMNS}`,
    [value.id, value.name, value.capacity, value.icon, value.floor, value.location, value.is_active]
  );
  return toRoom(rows[0]);
}

async function updateRoom(id, fields) {
  const { rows } = await buildUpdate('rooms', id, mapRoomFields(fields), ROOM_COLUMNS);
  if (!rows[0]) throw new Error('ไม่พบห้อง');
  return toRoom(rows[0]);
}

async function deleteRoom(id) {
  await query('DELETE FROM rooms WHERE id = $1', [id]);
  return true;
}

async function getAllBookings() {
  const { rows } = await query(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY created_at DESC`);
  return rows.map(toBooking);
}

async function appendBooking(booking) {
  const value = fromBooking(booking);
  const { rows } = await query(
    `INSERT INTO bookings
       (id, name, phone, dept, room, booking_date, start_time, end_time, purpose, status, activity, attendees, equipment, additional_services, metadata)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING ${BOOKING_COLUMNS}`,
    [
      value.id, value.name, value.phone, value.dept, value.room, value.booking_date,
      value.start_time, value.end_time, value.purpose, value.status, value.activity,
      value.attendees, value.equipment, value.additional_services, value.metadata
    ]
  );
  return toBooking(rows[0]);
}

async function updateBookingStatus(id, status) {
  const { rows } = await query(
    `UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`,
    [id, status]
  );
  if (!rows[0]) throw new Error(`การจอง ${id} ไม่พบในระบบ`);
  return toBooking(rows[0]);
}

async function updateBooking(id, fields) {
  const mapped = mapBookingFields(fields);
  const entries = Object.entries(mapped).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    const { rows } = await query(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`, [id]);
    if (!rows[0]) throw new Error(`การจอง ${id} ไม่พบในระบบ`);
    return toBooking(rows[0]);
  }

  const assignments = entries.map(([key], index) => (
    key === 'metadata'
      ? `metadata = COALESCE(metadata, '{}'::jsonb) || $${index + 2}::jsonb`
      : `${key} = $${index + 2}`
  ));
  assignments.push('updated_at = now()');

  const { rows } = await query(
    `UPDATE bookings SET ${assignments.join(', ')} WHERE id = $1 RETURNING ${BOOKING_COLUMNS}`,
    [id, ...entries.map(([, value]) => value)]
  );
  if (!rows[0]) throw new Error(`การจอง ${id} ไม่พบในระบบ`);
  return toBooking(rows[0]);
}

async function deleteBooking(id) {
  await query('DELETE FROM bookings WHERE id = $1', [id]);
  return true;
}

async function getAdminUsers() {
  const { rows } = await query(`SELECT ${ADMIN_USER_COLUMNS} FROM admin_users ORDER BY created_at ASC`);
  return rows.map(row => toAdminUser(row));
}

async function getAdminUserByLogin(login) {
  const normalized = String(login || '').trim().toLowerCase();
  const { rows } = await query(
    `SELECT ${ADMIN_USER_COLUMNS} FROM admin_users WHERE username = $1 LIMIT 1`,
    [normalized]
  );
  return rows[0] ? toAdminUser(rows[0], true) : null;
}

async function createAdminUser(user) {
  const value = fromAdminUser(user);
  const { rows } = await query(
    `INSERT INTO admin_users (id, username, name, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${ADMIN_USER_COLUMNS}`,
    [value.id, value.username, value.name, value.role, value.password_hash]
  );
  return toAdminUser(rows[0]);
}

async function updateAdminUser(id, fields) {
  const { rows } = await buildUpdate('admin_users', id, mapAdminUserFields(fields), ADMIN_USER_COLUMNS);
  if (!rows[0]) throw new Error('ไม่พบผู้ใช้');
  return toAdminUser(rows[0]);
}

async function deleteAdminUser(id) {
  await query('DELETE FROM admin_users WHERE id = $1', [id]);
  return true;
}

module.exports = {
  isEnabled,
  getPool,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getAllBookings,
  appendBooking,
  updateBookingStatus,
  updateBooking,
  deleteBooking,
  getAdminUsers,
  getAdminUserByLogin,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
};
