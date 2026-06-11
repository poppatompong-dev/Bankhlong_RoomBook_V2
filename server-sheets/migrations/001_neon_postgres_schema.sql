create table if not exists rooms (
  id text primary key,
  name text not null unique,
  capacity integer not null check (capacity > 0),
  icon text not null default '🏢',
  floor text not null,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id text primary key,
  name text not null,
  phone text not null,
  dept text,
  room text not null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null,
  status text not null default 'confirmed',
  activity text,
  attendees integer not null default 0,
  equipment jsonb not null default '{}'::jsonb,
  additional_services jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_order check (end_time > start_time)
);

create index if not exists bookings_date_room_idx on bookings (booking_date, room);
create index if not exists bookings_status_idx on bookings (status);

create table if not exists room_layouts (
  id text primary key,
  label text not null,
  icon text not null default '▦',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists room_layouts_active_sort_idx on room_layouts (is_active, sort_order);

create table if not exists admin_users (
  id text primary key,
  username text not null unique,
  name text not null,
  role text not null default 'admin',
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into rooms (id, name, capacity, icon, floor)
values
  ('r1', 'ห้องมณีจันทรา ชั้น 1', 20, '💎', '1'),
  ('r2', 'ห้องพระพุทธสัมฤทธิ์โกสีย์ ชั้น 3', 30, '🏛️', '3'),
  ('r3', 'ห้องชัยบุรี กองสาธารณสุข', 20, '⚔️', '2'),
  ('r4', 'ห้องประชุมสารสนเทศ (ศูนย์ข้อมูลข่าวสาร)', 10, '💻', '2'),
  ('r5', 'อาคารเอนกประสงค์ (โดม)', 200, '🏟️', 'G')
on conflict (id) do nothing;

insert into admin_users (id, username, name, role, password_hash)
values ('u1', 'admin', 'ผู้ดูแลระบบ', 'admin', null)
on conflict (id) do nothing;

insert into room_layouts (id, label, icon, sort_order)
values
  ('classroom', 'ห้องเรียน (Classroom)', '🎓', 10),
  ('conference', 'ประชุมกลุ่ม (Conference)', '🪑', 20),
  ('ushape', 'ยู-เชฟ (U-Shape)', '🔵', 30),
  ('theater', 'เธียเตอร์ (Theater)', '🎭', 40),
  ('banquet', 'แบงควิต (Banquet)', '🍽️', 50),
  ('other', 'อื่นๆ (ระบุ)', '📐', 60)
on conflict (id) do nothing;
