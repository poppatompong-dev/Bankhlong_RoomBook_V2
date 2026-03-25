import { useState, useEffect } from 'react';
import { roomsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const [rooms, setRooms] = useState([]);
  const [gcalEnabled, setGcalEnabled] = useState(true);
  const [lineEnabled, setLineEnabled] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    roomsAPI.list().then(res => setRooms(res.data)).catch(() => {});
  }, []);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-prompt text-xl font-bold text-gray-800">⚙️ การตั้งค่า</h1>
        <p className="text-sm text-gray-400">จัดการการเชื่อมต่อและการแจ้งเตือน</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile */}
        <div className="card">
          <div className="card-header"><div className="card-title">👤 โปรไฟล์</div></div>
          <div className="card-body">
            {[['ชื่อ', user?.name], ['อีเมล', user?.email], ['เบอร์โทร', user?.phone || '-'], ['สถานะ', user?.role === 'admin' ? '👑 ผู้ดูแลระบบ' : '👤 ผู้ใช้งาน']].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <span className="text-sm text-gray-500 font-semibold">{k}</span>
                <span className="text-sm text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="card">
          <div className="card-header"><div className="card-title">🔌 การเชื่อมต่อ API</div></div>
          <div className="card-body">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 rounded-xl mb-3" style={{border:'1.5px solid #e2e8f0'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#fce4ec'}}>📅</div>
                <div>
                  <div className="text-sm font-semibold">Google Calendar</div>
                  <div className="text-xs text-gray-400">สร้าง/ลบนัดหมายอัตโนมัติ</div>
                  {gcalEnabled && <span className="badge badge-success mt-1">เชื่อมต่อแล้ว</span>}
                </div>
              </div>
              <label className="relative w-11 h-6 inline-block">
                <input type="checkbox" checked={gcalEnabled} onChange={e => {
                  setGcalEnabled(e.target.checked);
                  showToast(e.target.checked ? '📅 เปิด Google Calendar แล้ว' : '📅 ปิด Google Calendar แล้ว', 'info');
                }} className="opacity-0 w-0 h-0 peer" />
                <div className="absolute inset-0 bg-gray-300 rounded-xl cursor-pointer transition-all peer-checked:bg-teal-500"></div>
                <div className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] left-[3px] transition-all shadow peer-checked:translate-x-5"></div>
              </label>
            </div>

            {/* LINE Notify */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{border:'1.5px solid #e2e8f0'}}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'#e8f5e9'}}>💬</div>
                <div>
                  <div className="text-sm font-semibold">LINE Notify</div>
                  <div className="text-xs text-gray-400">แจ้งเตือนการจอง/ยกเลิก</div>
                  {lineEnabled && <span className="badge badge-success mt-1">เปิดใช้งาน</span>}
                </div>
              </div>
              <label className="relative w-11 h-6 inline-block">
                <input type="checkbox" checked={lineEnabled} onChange={e => {
                  setLineEnabled(e.target.checked);
                  showToast(e.target.checked ? '💬 เปิด LINE Notify แล้ว' : '💬 ปิด LINE Notify แล้ว', 'info');
                }} className="opacity-0 w-0 h-0 peer" />
                <div className="absolute inset-0 bg-gray-300 rounded-xl cursor-pointer transition-all peer-checked:bg-teal-500"></div>
                <div className="absolute w-[18px] h-[18px] bg-white rounded-full top-[3px] left-[3px] transition-all shadow peer-checked:translate-x-5"></div>
              </label>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="card">
          <div className="card-header"><div className="card-title">📋 API Endpoints</div></div>
          <div className="card-body">
            {[
              { method: 'POST', path: '/api/auth/login', desc: 'เข้าสู่ระบบ', color: '#d1fae5', textColor: '#065f46' },
              { method: 'POST', path: '/api/auth/register', desc: 'ลงทะเบียน', color: '#d1fae5', textColor: '#065f46' },
              { method: 'GET', path: '/api/rooms', desc: 'ดึงรายชื่อห้อง', color: '#dbeafe', textColor: '#1e40af' },
              { method: 'GET', path: '/api/bookings', desc: 'ดึงรายการจอง', color: '#dbeafe', textColor: '#1e40af' },
              { method: 'POST', path: '/api/bookings', desc: 'สร้างการจองใหม่', color: '#d1fae5', textColor: '#065f46' },
              { method: 'PUT', path: '/api/bookings/:id', desc: 'อนุมัติ/ยกเลิก', color: '#fef3c7', textColor: '#92400e' },
              { method: 'DELETE', path: '/api/bookings/:id', desc: 'ยกเลิกการจอง', color: '#fee2e2', textColor: '#991b1b' },
            ].map(ep => (
              <div key={ep.method + ep.path} className="py-2.5 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded font-mono" style={{background:ep.color,color:ep.textColor}}>{ep.method}</span>
                  <code className="text-xs text-gray-700 font-mono">{ep.path}</code>
                </div>
                <div className="text-xs text-gray-400 pl-1">{ep.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* All Rooms */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏢 ห้องทั้งหมด</div></div>
          <div className="card-body">
            {rooms.map(r => (
              <div key={r._id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                <span className="text-xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-gray-400">ชั้น {r.floor} · {r.capacity} ที่นั่ง</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 font-mono">{r._id.slice(-6)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
