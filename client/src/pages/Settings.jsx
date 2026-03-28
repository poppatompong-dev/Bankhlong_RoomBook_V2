import { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GCAL_ID = 'cvq6279kfec56nnmsa90sq16vc@group.calendar.google.com';
const GCAL_EMBED = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GCAL_ID)}&ctz=Asia%2FBangkok&hl=th&mode=WEEK&showTitle=0&showNav=1&showPrint=0&showTabs=1&showCalendars=0`;

export default function Settings() {
  const [rooms, setRooms] = useState([]);
  const [calMode, setCalMode] = useState('WEEK');
  const { user } = useAuth();

  useEffect(() => {
    roomsAPI.list().then(res => setRooms(res.data.rooms || [])).catch(() => {});
  }, []);

  const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GCAL_ID)}&ctz=Asia%2FBangkok&hl=th&mode=${calMode}&showTitle=0&showNav=1&showPrint=0&showTabs=1&showCalendars=0`;

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-prompt text-xl font-bold text-gray-800">⚙️ การตั้งค่า</h1>
        <p className="text-sm text-gray-400">จัดการการเชื่อมต่อและการแจ้งเตือน</p>
      </div>

      {/* Google Calendar Embed — full width */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-title">📅 Google Calendar — การจองห้องประชุม</div>
          <div className="flex gap-2">
            {['DAY', 'WEEK', 'MONTH', 'AGENDA'].map(m => (
              <button key={m} onClick={() => setCalMode(m)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all"
                style={{
                  background: calMode === m ? '#0d9488' : '#f1f5f9',
                  color: calMode === m ? 'white' : '#64748b'
                }}>
                {m === 'DAY' ? 'วัน' : m === 'WEEK' ? 'สัปดาห์' : m === 'MONTH' ? 'เดือน' : 'กำหนดการ'}
              </button>
            ))}
            <a href={`https://calendar.google.com/calendar/r?cid=${GCAL_ID}`}
              target="_blank" rel="noreferrer"
              className="px-3 py-1 rounded-lg text-xs font-semibold no-underline transition-all"
              style={{ background: '#f1f5f9', color: '#64748b' }}>
              🔗 เปิดใน Google
            </a>
          </div>
        </div>
        <div style={{ padding: 0, background: '#f8fafc', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
            frameBorder="0"
            scrolling="no"
            title="Google Calendar"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile */}
        <div className="card">
          <div className="card-header"><div className="card-title">👤 โปรไฟล์</div></div>
          <div className="card-body">
            {[
              ['ชื่อ-นามสกุล', user?.name],
              ['ชื่อบัญชีผู้ใช้', user?.username || user?.email],
              ['เบอร์โทร', user?.phone || '-'],
              ['สถานะ', user?.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '👤 ผู้ใช้งาน']
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <span className="text-sm text-gray-500 font-semibold">{k}</span>
                <span className="text-sm text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GCal Status */}
        <div className="card">
          <div className="card-header"><div className="card-title">🔌 สถานะการเชื่อมต่อ</div></div>
          <div className="card-body">
            <div className="p-4 rounded-xl mb-3" style={{ border: '1.5px solid #e2e8f0' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#f0fdf4' }}>📅</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">Google Calendar</div>
                  <div className="text-xs text-gray-400 mt-0.5">Calendar ID: &nbsp;
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {GCAL_ID}
                    </code>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg text-xs" style={{ background: '#fef9ec', border: '1px solid #fde68a', fontFamily: 'Sarabun' }}>
                <div className="font-semibold text-amber-800 mb-1">⚠️ อยู่ในโหมดจำลอง (Simulated)</div>
                <div className="text-amber-700">เพื่อให้ระบบสร้าง event จริงบน Google Calendar ต้องเพิ่ม Service Account:</div>
                <ol className="list-decimal pl-4 mt-2 space-y-1 text-amber-700">
                  <li>ไปที่ <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Cloud Console</a> → สร้าง Project</li>
                  <li>เปิดใช้งาน Google Calendar API</li>
                  <li>สร้าง Service Account → สร้าง Key (JSON)</li>
                  <li>Share Calendar ให้ Service Account email → สิทธิ์ "จัดการกิจกรรม"</li>
                  <li>วาง JSON ใน <code className="bg-amber-100 px-1 rounded">server/.env</code> → <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON=...</code></li>
                </ol>
              </div>
            </div>

            {/* MongoDB */}
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ border: '1.5px solid #e2e8f0' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#f0fdf4' }}>🍃</div>
              <div>
                <div className="text-sm font-semibold">MongoDB Atlas</div>
                <div className="text-xs text-gray-400">Bankhlong_RoomBook_V2</div>
                <span className="badge badge-success mt-1">เชื่อมต่อแล้ว</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="card">
          <div className="card-header"><div className="card-title">📋 API Endpoints</div></div>
          <div className="card-body">
            {[
              { method: 'POST', path: '/api/auth/login', desc: 'เข้าสู่ระบบ', color: '#d1fae5', textColor: '#065f46' },
              { method: 'GET', path: '/api/rooms', desc: 'ดึงรายชื่อห้อง', color: '#dbeafe', textColor: '#1e40af' },
              { method: 'GET', path: '/api/bookings', desc: 'ดึงรายการจอง', color: '#dbeafe', textColor: '#1e40af' },
              { method: 'POST', path: '/api/bookings', desc: 'สร้างการจองใหม่ (อนุมัติทันที)', color: '#d1fae5', textColor: '#065f46' },
              { method: 'PUT', path: '/api/bookings/:id', desc: 'ยกเลิกการจอง (Admin)', color: '#fef3c7', textColor: '#92400e' },
              { method: 'GET', path: '/api/users', desc: 'ดึงรายชื่อผู้ใช้ (Admin)', color: '#ede9fe', textColor: '#5b21b6' },
            ].map(ep => (
              <div key={ep.method + ep.path} className="py-2.5 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded font-mono" style={{ background: ep.color, color: ep.textColor }}>{ep.method}</span>
                  <code className="text-xs text-gray-700 font-mono">{ep.path}</code>
                </div>
                <div className="text-xs text-gray-400 pl-1">{ep.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rooms list */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏢 ห้องประชุมในระบบ ({rooms.length} ห้อง)</div></div>
          <div className="card-body">
            {rooms.map(r => (
              <div key={r._id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <span className="text-xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-gray-400">ชั้น {r.floor} · จุ {r.capacity} คน</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-600 font-semibold">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
