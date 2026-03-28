import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const USER_GUIDE = [
  {
    id: 'u1', icon: '📅', title: 'ดูปฏิทินห้องประชุม',
    steps: [
      'เปิดหน้าแรก แล้วกดปุ่ม "เริ่มจองห้องประชุม"',
      'ระบบแสดงหน้าแดชบอร์ดพร้อมปฏิทิน และรายการห้องประชุมทั้งหมด',
      'คลิกวันที่บนปฏิทิน → ระบบแสดงป็อปอัปฟอร์มการจองทันที',
      'ด้านขวาแสดงรายการห้องว่าง ✅ และห้องถูกจอง ❌ ของวันนั้น',
      'แถบวิ่งด้านบนแสดงการจองที่ใกล้จะมาถึง เรียงจากเร็วที่สุด',
    ],
  },
  {
    id: 'u2', icon: '📝', title: 'วิธีจองห้องประชุม',
    steps: [
      'คลิกวันที่ในปฏิทิน หรือกดปุ่ม "+ จองห้องประชุม" ด้านบน',
      'ขั้นตอนที่ 1 — กรอกข้อมูลผู้จอง: ชื่อ-นามสกุล, เบอร์โทร, หน่วยงาน, วัตถุประสงค์, จำนวนผู้เข้าร่วม',
      'ขั้นตอนที่ 2 — เลือกห้องประชุม (แสดงชื่อห้อง + ความจุ + ชั้น), รูปแบบจัดห้อง, เวลาเริ่ม-สิ้นสุด',
      'ขั้นตอนที่ 3 — เลือกอุปกรณ์ที่ต้องการ (เครื่องเสียง, โปรเจคเตอร์ ฯลฯ) และบริการเพิ่มเติม',
      'กด "ยืนยันการจอง" — ระบบบันทึกและอนุมัติทันที ไม่ต้องรอเจ้าหน้าที่',
    ],
  },
  {
    id: 'u3', icon: '✅', title: 'สถานะการจองและระบบอนุมัติ',
    steps: [
      'การจองทุกรายการจะได้รับการ "อนุมัติทันที" โดยอัตโนมัติ',
      'สถานะ ✅ อนุมัติแล้ว (สีเขียว) — สามารถใช้ห้องได้ตามเวลาที่จอง',
      'สถานะ ❌ ยกเลิก (สีแดง) — ถูกยกเลิกโดยผู้จองหรือเจ้าหน้าที่',
      'ระบบป้องกันการจองซ้ำซ้อนอัตโนมัติ (เวลาทับซ้อนกันไม่ได้)',
      'ข้อมูลการจองแสดงบนปฏิทินทุกวันแบบ Real-time',
    ],
  },
  {
    id: 'u4', icon: '📋', title: 'ข้อปฏิบัติการใช้ห้องประชุม',
    steps: [
      'ผู้จองต้องรับผิดชอบดูแลความเรียบร้อยระหว่างและหลังการใช้งาน',
      'ต้องแจ้งยกเลิกล่วงหน้าอย่างน้อย 1 ชั่วโมง กรณีไม่ใช้งาน',
      'จองได้สูงสุด 8 ชั่วโมงต่อครั้ง',
      'ปิดไฟ-แอร์ และนำอุปกรณ์ที่นำมาเองออกให้ครบหลังเสร็จงาน',
      'หากมีปัญหาเร่งด่วน ติดต่อเจ้าหน้าที่ได้โดยตรง',
    ],
  },
  {
    id: 'u5', icon: '📱', title: 'การใช้งานบนมือถือ',
    steps: [
      'ระบบรองรับทุกขนาดหน้าจอ — มือถือ, แท็บเล็ต, คอมพิวเตอร์',
      'เปิดเบราว์เซอร์แล้วเข้าสู่ URL ของระบบได้ทันที ไม่ต้องติดตั้งแอป',
      'ปฏิทินและฟอร์มการจองปรับขนาดให้เหมาะสมกับหน้าจออัตโนมัติ',
      'แถบแสดงการจองที่กำลังจะมาถึง (Ticker) แสดงผลบนทุกอุปกรณ์',
    ],
  },
];

const ADMIN_GUIDE = [
  {
    id: 'a1', icon: '🔐', title: 'วิธีเข้าสู่ระบบสำหรับเจ้าหน้าที่',
    steps: [
      'กดปุ่ม "สำหรับเจ้าหน้าที่" ที่ Header หรือไปที่ /login',
      'กรอก ชื่อบัญชีผู้ใช้ (ไม่จำเป็นต้องเป็นอีเมล) และรหัสผ่าน',
      'บัญชีผู้ดูแล: username "admin" / รหัสผ่าน "admin123"',
      'เมื่อล็อกอินสำเร็จ ระบบนำไปหน้าจัดการ (Admin) ทันที',
    ],
  },
  {
    id: 'a2', icon: '📋', title: 'จัดการการจองห้องประชุม',
    steps: [
      'เปิดแท็บ "การจองห้อง" ในหน้าแอดมิน',
      'กดไอคอน 👁️ เพื่อดูรายละเอียดการจองทั้งหมด (อุปกรณ์ บริการ ฯลฯ)',
      'กดปุ่ม "ยกเลิก" เพื่อยกเลิกการจองนั้น — ระบบจะมีหน้าต่างยืนยันก่อน',
      'ทุกการดำเนินการมีการบันทึก Log ไว้ในระบบ',
    ],
  },
  {
    id: 'a3', icon: '🏢', title: 'การจัดการห้องประชุม',
    steps: [
      'เปิดแท็บ "ห้องประชุม" ในหน้าแอดมิน',
      'กดปุ่ม "+ เพิ่มห้อง" เพื่อเพิ่มห้องใหม่ (ชื่อ, ความจุ, ชั้น, ไอคอน)',
      'กดปุ่ม "✏️ แก้ไข" เพื่อแก้ไขข้อมูลห้องที่มีอยู่',
      'กดปุ่ม "🗑️ ลบ" พร้อมยืนยัน — ระวัง: ข้อมูลการจองที่อ้างอิงจะไม่ถูกลบ',
      'ห้องที่เพิ่มจะปรากฏในฟอร์มการจองและปฏิทินทันที',
    ],
  },
  {
    id: 'a4', icon: '👥', title: 'การจัดการบัญชีผู้ใช้',
    steps: [
      'เปิดแท็บ "ผู้ใช้งาน" ในหน้าแอดมิน',
      'กด "+ เพิ่มผู้ใช้" — กรอกชื่อบัญชี (username ภาษาอังกฤษ ไม่ต้องใช้อีเมล)',
      'เลือก role: "admin" เพื่อให้สิทธิ์จัดการระบบ, "user" สำหรับผู้ใช้ทั่วไป',
      'กด "✏️ แก้ไข" เพื่ออัปเดตชื่อ, เบอร์, role หรือเปลี่ยนรหัสผ่าน',
      'กด "🗑️ ลบ" เพื่อปิดใช้งานบัญชีนั้น',
    ],
  },
  {
    id: 'a5', icon: '📊', title: 'ดูสถิติและรายงาน (สำหรับ Admin)',
    steps: [
      'เมนู "สถิติ" จะปรากฏใน Header เฉพาะเมื่อล็อกอินด้วยบัญชี Admin',
      'แสดงจำนวนการจองตามห้อง, ตามช่วงเวลา และแนวโน้มรายเดือน',
      'กรองข้อมูลได้ตาม: วันที่, ห้อง, สถานะการจอง',
    ],
  },
  {
    id: 'a6', icon: '⚙️', title: 'การตั้งค่าระบบ',
    steps: [
      'เมนู "การตั้งค่า" แสดงข้อมูลโปรไฟล์และสถานะการเชื่อมต่อ',
      'ตรวจสอบสถานะ Google Calendar (เชื่อมต่อแล้ว/โหมดจำลอง)',
      'ดูรายชื่อ API Endpoint ที่ระบบใช้งาน',
      'ตั้งค่า GOOGLE_SERVICE_ACCOUNT_JSON ใน server/.env เพื่อเชื่อม Google Calendar จริง',
    ],
  },
];

function GuideCard({ item, expanded, onToggle }) {
  return (
    <div
      className="rounded-2xl border transition-all overflow-hidden"
      style={{ border: expanded ? '1.5px solid #14b8a6' : '1.5px solid #e2e8f0', background: 'white' }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 cursor-pointer bg-transparent border-none"
        style={{ fontFamily: 'Sarabun, sans-serif' }}
      >
        <span className="text-2xl flex-shrink-0">{item.icon}</span>
        <span className="flex-1 font-semibold text-gray-800 text-base text-left">{item.title}</span>
        <span className="text-gray-400 text-lg transition-transform flex-shrink-0"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
      </button>
      {expanded && (
        <div className="px-5 pb-5">
          <ol className="space-y-2.5 mt-1">
            {item.steps.map((step, i) => (
              <li key={i} className="flex gap-3 items-start text-sm text-gray-700"
                style={{ fontFamily: 'Sarabun, sans-serif' }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: '#ccfbf1', color: '#0d9488' }}>{i + 1}</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('user');
  const [expanded, setExpanded] = useState({ u1: true, a1: true });
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 text-white" style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
        boxShadow: '0 4px 20px rgba(13,148,136,0.4)'
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between" style={{ height: 64 }}>
            <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-white">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <img src={logo} alt="โลโก้" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-base leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>เทศบาลตำบลบ้านคลอง</div>
                <div className="text-xs opacity-85" style={{ fontFamily: 'Sarabun, sans-serif' }}>คู่มือการใช้งานระบบจองห้องประชุม</div>
              </div>
              <div className="sm:hidden font-bold text-sm" style={{ fontFamily: 'Prompt, sans-serif' }}>คู่มือการใช้งาน</div>
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer border-none transition-all whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'Sarabun, sans-serif' }}>
              📅 จองห้องประชุม
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-2xl sm:text-3xl text-gray-800 mb-2" style={{ fontFamily: 'Prompt, sans-serif' }}>
            📖 คู่มือการใช้งาน
          </h1>
          <p className="text-gray-500 text-sm sm:text-base" style={{ fontFamily: 'Sarabun, sans-serif' }}>
            ระบบจองห้องประชุม เทศบาลตำบลบ้านคลอง จ.พิษณุโลก
          </p>
        </div>

        {/* System highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: '⚡', label: 'อนุมัติทันที', sub: 'ไม่ต้องรอเจ้าหน้าที่' },
            { icon: '📱', label: 'ทุกอุปกรณ์', sub: 'PC / มือถือ / แท็บเล็ต' },
            { icon: '🔒', label: 'ป้องกันซ้ำซ้อน', sub: 'ระบบตรวจสอบอัตโนมัติ' },
            { icon: '📡', label: 'Real-time', sub: 'ข้อมูลอัปเดตสด' },
          ].map(h => (
            <div key={h.label} className="text-center p-3 rounded-2xl" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="text-2xl mb-1">{h.icon}</div>
              <div className="text-xs font-bold text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>{h.label}</div>
              <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>{h.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 max-w-md mx-auto">
          <button onClick={() => setTab('user')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{ fontFamily: 'Sarabun, sans-serif', background: tab === 'user' ? 'white' : 'transparent', color: tab === 'user' ? '#0d9488' : '#64748b', boxShadow: tab === 'user' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            👤 ผู้ใช้ทั่วไป
          </button>
          <button onClick={() => setTab('admin')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{ fontFamily: 'Sarabun, sans-serif', background: tab === 'admin' ? 'white' : 'transparent', color: tab === 'admin' ? '#0d9488' : '#64748b', boxShadow: tab === 'admin' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
            🛡️ เจ้าหน้าที่/แอดมิน
          </button>
        </div>

        {/* User guide */}
        {tab === 'user' && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-4 rounded-2xl mb-5 text-sm flex gap-3 items-start"
              style={{ background: '#f0fdf9', border: '1px solid #99f6e4', fontFamily: 'Sarabun, sans-serif' }}>
              <span className="text-2xl flex-shrink-0">💡</span>
              <div className="text-teal-800">
                <div className="font-bold mb-1">ไม่ต้องสมัครสมาชิก — จองได้ทันที!</div>
                <div>เพียงกรอกชื่อและเบอร์โทรศัพท์ ระบบจะอนุมัติการจองให้อัตโนมัติทันทีโดยไม่ต้องรอเจ้าหน้าที่</div>
              </div>
            </div>
            {USER_GUIDE.map(item => (
              <GuideCard key={item.id} item={item} expanded={!!expanded[item.id]} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        )}

        {/* Admin guide */}
        {tab === 'admin' && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-4 rounded-2xl mb-5 text-sm flex gap-3 items-start"
              style={{ background: '#fef9ec', border: '1px solid #fde68a', fontFamily: 'Sarabun, sans-serif' }}>
              <span className="text-2xl flex-shrink-0">🛡️</span>
              <div className="text-amber-800">
                <div className="font-bold mb-1">สำหรับเจ้าหน้าที่และผู้ดูแลระบบ</div>
                <div>เข้าสู่ระบบที่ปุ่ม "สำหรับเจ้าหน้าที่" ในแถบเมนู — บัญชีเริ่มต้น: <strong>admin / admin123</strong></div>
              </div>
            </div>
            {ADMIN_GUIDE.map(item => (
              <GuideCard key={item.id} item={item} expanded={!!expanded[item.id]} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📅', label: 'จองห้องประชุม', desc: 'เข้าสู่ระบบจองห้อง', action: () => navigate('/dashboard'), color: '#0d9488' },
            { icon: '🛡️', label: 'หน้าแอดมิน', desc: 'จัดการการจองและห้อง', action: () => navigate('/admin'), color: '#7c3aed' },
            { icon: '🏠', label: 'หน้าแรก', desc: 'กลับสู่หน้าหลัก', action: () => navigate('/'), color: '#0891b2' },
          ].map(b => (
            <button key={b.label} onClick={b.action}
              className="p-5 rounded-2xl text-left cursor-pointer hover:shadow-md transition-all"
              style={{ background: 'white', border: '1.5px solid #e2e8f0' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div className="text-2xl mb-2">{b.icon}</div>
              <div className="font-bold text-gray-800 text-sm" style={{ fontFamily: 'Sarabun, sans-serif' }}>{b.label}</div>
              <div className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>{b.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 px-4" style={{ fontFamily: 'Sarabun, sans-serif' }}>
        <div className="text-gray-400 text-xs">เทศบาลตำบลบ้านคลอง อ.เมือง จ.พิษณุโลก · ระบบจองห้องประชุม</div>
        <div className="text-gray-300 text-xs mt-1">พัฒนาโดย นักวิชาการคอมพิวเตอร์ · เทศบาลตำบลบ้านคลอง</div>
      </footer>
    </div>
  );
}
