const { createClient } = require('@supabase/supabase-js');

const ROOM_COLUMNS = 'id,name,capacity,icon,floor,location,is_active,created_at,updated_at';
const BOOKING_COLUMNS = 'id,name,phone,dept,room,booking_date,start_time,end_time,purpose,status,activity,attendees,equipment,additional_services,metadata,created_at,updated_at';
const ADMIN_USER_COLUMNS = 'id,username,name,role,password_hash,created_at,updated_at';
const ROOM_LAYOUT_COLUMNS = 'id,label,icon,sort_order,is_active,created_at,updated_at';

let client = null;

function isEnabled() {
  return process.env.MOCK_DATABASE !== 'true' &&
    !!process.env.SUPABASE_URL &&
    !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}

function getClient() {
  if (!isEnabled()) return null;
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  return client;
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
    name: room.name,
    capacity: Number(room.capacity),
    icon: room.icon || '🏢',
    floor: String(room.floor),
    location: room.location || null,
    is_active: room.isActive !== false
  };
}

function mapRoomFields(fields) {
  const mapped = {};
  if (fields.name !== undefined) mapped.name = fields.name;
  if (fields.capacity !== undefined) mapped.capacity = Number(fields.capacity);
  if (fields.icon !== undefined) mapped.icon = fields.icon || '🏢';
  if (fields.floor !== undefined) mapped.floor = String(fields.floor);
  if (fields.location !== undefined) mapped.location = fields.location || null;
  if (fields.isActive !== undefined) mapped.is_active = fields.isActive !== false;
  return mapped;
}

function toBooking(row) {
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    phone: row.phone,
    dept: row.dept || '',
    room: row.room,
    date: row.booking_date,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    purpose: row.purpose,
    status: row.status || 'confirmed',
    activity: row.activity || '',
    attendees: row.attendees || 0,
    equipment: row.equipment || {},
    additionalServices: row.additional_services || {},
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toAdminUser(row) {
  return {
    id: row.id,
    _id: row.id,
    username: row.username,
    name: row.name,
    role: row.role || 'admin',
    phone: '',
    isActive: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toRoomLayout(row) {
  return {
    id: row.id,
    _id: row.id,
    label: row.label,
    icon: row.icon || '▦',
    sortOrder: row.sort_order || 0,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromRoomLayout(layout) {
  return {
    id: layout.id,
    label: String(layout.label || '').trim(),
    icon: layout.icon || '▦',
    sort_order: Number(layout.sortOrder) || 0,
    is_active: layout.isActive !== false
  };
}

function mapRoomLayoutFields(fields) {
  const mapped = {};
  if (fields.label !== undefined) mapped.label = String(fields.label).trim();
  if (fields.icon !== undefined) mapped.icon = fields.icon || '▦';
  if (fields.sortOrder !== undefined) mapped.sort_order = Number(fields.sortOrder) || 0;
  if (fields.isActive !== undefined) mapped.is_active = fields.isActive !== false;
  return mapped;
}

function fromAdminUser(user) {
  return {
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

function fromBooking(booking) {
  return {
    id: booking.id,
    name: booking.name,
    phone: booking.phone,
    dept: booking.dept || booking.requesterDept || null,
    room: booking.room,
    booking_date: booking.date,
    start_time: booking.startTime,
    end_time: booking.endTime,
    purpose: booking.purpose,
    status: booking.status || 'confirmed',
    activity: booking.activity || null,
    attendees: Number(booking.attendees) || 0,
    equipment: booking.equipment || {},
    additional_services: booking.additionalServices || booking.additional_services || {},
    metadata: booking.metadata || {}
  };
}

function mapBookingFields(fields) {
  const mapped = {};
  if (fields.name !== undefined) mapped.name = fields.name;
  if (fields.phone !== undefined) mapped.phone = fields.phone;
  if (fields.dept !== undefined) mapped.dept = fields.dept;
  if (fields.room !== undefined) mapped.room = fields.room;
  if (fields.date !== undefined) mapped.booking_date = fields.date;
  if (fields.startTime !== undefined) mapped.start_time = fields.startTime;
  if (fields.endTime !== undefined) mapped.end_time = fields.endTime;
  if (fields.purpose !== undefined) mapped.purpose = fields.purpose;
  if (fields.status !== undefined) mapped.status = fields.status;
  if (fields.activity !== undefined) mapped.activity = fields.activity;
  if (fields.attendees !== undefined) mapped.attendees = Number(fields.attendees) || 0;
  if (fields.equipment !== undefined) mapped.equipment = fields.equipment;
  if (fields.additionalServices !== undefined) mapped.additional_services = fields.additionalServices;
  if (fields.metadata !== undefined) mapped.metadata = fields.metadata;
  return mapped;
}

function throwIfError(error) {
  if (error) throw new Error(error.message);
}

async function getRooms() {
  const { data, error } = await getClient()
    .from('rooms')
    .select(ROOM_COLUMNS)
    .order('id', { ascending: true });
  throwIfError(error);
  return (data || []).map(toRoom);
}

async function createRoom(room) {
  const { data, error } = await getClient()
    .from('rooms')
    .insert(fromRoom(room))
    .select(ROOM_COLUMNS)
    .single();
  throwIfError(error);
  return toRoom(data);
}

async function updateRoom(id, fields) {
  const { data, error } = await getClient()
    .from('rooms')
    .update(mapRoomFields(fields))
    .eq('id', id)
    .select(ROOM_COLUMNS)
    .single();
  throwIfError(error);
  return toRoom(data);
}

async function deleteRoom(id) {
  const { error } = await getClient().from('rooms').delete().eq('id', id);
  throwIfError(error);
  return true;
}

async function getAllBookings() {
  const { data, error } = await getClient()
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .order('created_at', { ascending: false });
  throwIfError(error);
  return (data || []).map(toBooking);
}

async function appendBooking(booking) {
  const { data, error } = await getClient()
    .from('bookings')
    .insert(fromBooking(booking))
    .select(BOOKING_COLUMNS)
    .single();
  throwIfError(error);
  return toBooking(data);
}

async function updateBookingStatus(id, status) {
  const { data, error } = await getClient()
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select(BOOKING_COLUMNS)
    .single();
  throwIfError(error);
  return toBooking(data);
}

async function updateBooking(id, fields) {
  const { data, error } = await getClient()
    .from('bookings')
    .update(mapBookingFields(fields))
    .eq('id', id)
    .select(BOOKING_COLUMNS)
    .single();
  throwIfError(error);
  return toBooking(data);
}

async function deleteBooking(id) {
  const { error } = await getClient().from('bookings').delete().eq('id', id);
  throwIfError(error);
  return true;
}

async function getAdminUsers() {
  const { data, error } = await getClient()
    .from('admin_users')
    .select(ADMIN_USER_COLUMNS)
    .order('created_at', { ascending: true });
  throwIfError(error);
  return (data || []).map(toAdminUser);
}

async function getAdminUserByLogin(login) {
  const normalized = String(login || '').trim().toLowerCase();
  const { data, error } = await getClient()
    .from('admin_users')
    .select(ADMIN_USER_COLUMNS)
    .eq('username', normalized)
    .maybeSingle();
  throwIfError(error);
  return data;
}

async function createAdminUser(user) {
  const { data, error } = await getClient()
    .from('admin_users')
    .insert(fromAdminUser(user))
    .select(ADMIN_USER_COLUMNS)
    .single();
  throwIfError(error);
  return toAdminUser(data);
}

async function updateAdminUser(id, fields) {
  const { data, error } = await getClient()
    .from('admin_users')
    .update(mapAdminUserFields(fields))
    .eq('id', id)
    .select(ADMIN_USER_COLUMNS)
    .single();
  throwIfError(error);
  return toAdminUser(data);
}

async function deleteAdminUser(id) {
  const { error } = await getClient().from('admin_users').delete().eq('id', id);
  throwIfError(error);
  return true;
}

async function getRoomLayouts() {
  const { data, error } = await getClient()
    .from('room_layouts')
    .select(ROOM_LAYOUT_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  throwIfError(error);
  return (data || []).map(toRoomLayout);
}

async function createRoomLayout(layout) {
  const { data, error } = await getClient()
    .from('room_layouts')
    .insert(fromRoomLayout(layout))
    .select(ROOM_LAYOUT_COLUMNS)
    .single();
  throwIfError(error);
  return toRoomLayout(data);
}

async function updateRoomLayout(id, fields) {
  const { data, error } = await getClient()
    .from('room_layouts')
    .update(mapRoomLayoutFields(fields))
    .eq('id', id)
    .select(ROOM_LAYOUT_COLUMNS)
    .single();
  throwIfError(error);
  return toRoomLayout(data);
}

async function deleteRoomLayout(id) {
  const { error } = await getClient().from('room_layouts').delete().eq('id', id);
  throwIfError(error);
  return true;
}

module.exports = {
  isEnabled,
  getClient,
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
  deleteAdminUser,
  getRoomLayouts,
  createRoomLayout,
  updateRoomLayout,
  deleteRoomLayout
};
