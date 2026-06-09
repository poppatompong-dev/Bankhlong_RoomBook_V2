const { createClient } = require('@supabase/supabase-js');

const ROOM_COLUMNS = 'id,name,capacity,icon,floor,location,is_active,created_at,updated_at';
const BOOKING_COLUMNS = 'id,name,phone,dept,room,booking_date,start_time,end_time,purpose,status,activity,attendees,equipment,additional_services,metadata,created_at,updated_at';

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
  deleteBooking
};
