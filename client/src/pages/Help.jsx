import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const USER_GUIDE = [
  {
    id: 'u1', icon: '🔍', title: 'ดูปฏิทินห้องประชุม',
    steps: [
      'เปิดหน้าแรก แล้วกดปุ่ม "เริ่มจองห้องประชุม"',
      'ระบบจะแสดงหน้าแดชบอร์ด พร้อมปฏิทินและรายการห้องประชุม',
      'คลิกวันที่ในปฏิทินเพื่อดูสถานะห้องทั้งหมดในวันนั้น',
      'ห้องที่แสดงสี ✅ ว่าง / 🟡 รอการอนุมัติ / 🔴 ถูกจองแล้ว',
    ],
  },
  {
    id: 'u2', icon: '📝', title: 'วิธีจองห้องประชุม',
    steps: [
      'กดปุ่ม "จองห้องประชุม" หรือคลิกที่ห้องที่ต้องการ',
      'ขั้นตอนที่ 1 — กรอกข้อมูลผู้จอง: ชื่อ-นามสกุล, เบอร์โทร, หน่วยงาน, วัตถุประสงค์, จำนวนคน',
      'ขั้นตอนที่ 2 — เลือกห้องประชุม, รูปแบบการจัดห้อง, เวลาเริ่ม-สิ้นสุด (ช่วงสีเทา = จองแล้ว)',
      'ขั้นตอนที่ 3 — เลือกอุปกรณ์ที่ต้องการ, บริการเพิ่มเติม, แนบเอกสารประกอบ (ถ้ามี)',
      'กด "ส่งคำขอจอง" — ระบบจะส่งคำขอให้แอดมินอนุมัติ',
    ],
  },
  {
    id: 'u3', icon: '⏳', title: 'สถานะการจอง',
    steps: [
      'หลังส่งคำขอ สถานะจะเป็น "รออนุมัติ" (สีเหลือง)',
      'เมื่อแอดมินอนุมัติ สถานะจะเปลี่ยนเป็น "อนุมัติแล้ว" (สีเขียว)',
      'หากถูกปฏิเสธหรือยกเลิก สถานะจะเป็น "ยกเลิก" (สีแดง)',
      'หน้าปฏิทินจะอัปเดตสถานะแบบ Real-time ทุก 8 วินาที',
    ],
  },
  {
    id: 'u4', icon: '📋', title: 'ข้อปฏิบัติในการใช้ห้อง',
    steps: [
      'ผู้จองต้องรับผิดชอบดูแลความเรียบร้อยของห้องประชุม',
      'ต้องแจ้งยกเลิกล่วงหน้าอย่างน้อย 1 ชั่วโมง กรณีไม่ใช้งาน',
      'ห้องประชุมสูงสุด 8 ชั่วโมงต่อการจอง 1 ครั้ง',
      'โปรดนำอุปกรณ์ที่นำมาเองออกให้ครบหลังเสร็จงาน',
      'ปิดไฟ เครื่องปรับอากาศ และล็อกประตูหลังใช้งาน',
    ],
  },
  {
    id: 'u5', icon: '🆘', title: 'ติดต่อเจ้าหน้าที่',
    steps: [
      'หากพบปัญหาหรือต้องการแก้ไขการจอง ติดต่อแอดมินโดยตรง',
      'ผู้ดูแลระบบสามารถแก้ไข อนุมัติ หรือยกเลิกการจองได้',
      'แจ้งเลข ID การจอง (ดูจากอีเมลยืนยัน) เพื่อความรวดเร็ว',
    ],
  },
];

const ADMIN_GUIDE = [
  {
    id: 'a1', icon: '🔐', title: 'วิธีเข้าสู่ระบบแอดมิน',
    steps: [
      'กดปุ่ม "สำหรับผู้ดูแลระบบ" บนหน้าแรก หรือไปที่ /admin',
      'ใส่ข้อมูลเข้าสู่ระบบ: Email หรือ Username / Password',
      'บัญชีเริ่มต้น: admin@meeting.com / admin123  และ  jeng / jeng',
      'ระบบจะจำสถานะล็อกอินไว้ใน Session (ปิดแท็บแล้วต้องล็อกอินใหม่)',
    ],
  },
  {
    id: 'a2', icon: '✅', title: 'การอนุมัติ / ปฏิเสธการจอง',
    steps: [
      'เปิดแท็บ "การจองทั้งหมด" ในหน้าแอดมิน',
      'รายการสถานะ "รออนุมัติ" จะแสดงที่ด้านบนสุด',
      'กดปุ่ม ✅ อนุมัติ หรือ ❌ ยกเลิก ข้างรายการที่ต้องการ',
      'กดไอคอน 👁️ เพื่อดูรายละเอียดการจองทั้งหมด รวมถึงอุปกรณ์และบริการที่ขอ',
      'กดไอคอน ✏️ เพื่อแก้ไขข้อมูลการจอง',
    ],
  },
  {
    id: 'a3', icon: '🏢', title: 'การจัดการห้องประชุม',
    steps: [
      'เปิดแท็บ "ห้องประชุม" ในหน้าแอดมิน',
      'กดปุ่ม "+ เพิ่มห้อง" เพื่อเพิ่มห้องประชุมใหม่',
      'กรอก: ชื่อห้อง, ความจุ, ชั้น, สถานที่, ไอคอน',
      'กดไอคอน ✏️ เพื่อแก้ไขข้อมูลห้อง',
      'สามารถปิด/เปิดใช้งานห้องได้โดยไม่ต้องลบข้อมูล',
      'กดไอคอน 🗑️ เพื่อลบห้อง (ระวัง: การจองที่เกี่ยวข้องจะยังอยู่ในระบบ)',
    ],
  },
  {
    id: 'a4', icon: '👥', title: 'การจัดการผู้ใช้',
    steps: [
      'เปิดแท็บ "ผู้ใช้งาน" ในหน้าแอดมิน',
      'ดูรายชื่อผู้ใช้ทั้งหมด พร้อม role (admin / user)',
      'เพิ่มแอดมินใหม่: กด "+ เพิ่มผู้ใช้" แล้วเลือก role เป็น admin',
      'แก้ไขข้อมูล: email, ชื่อ, เบอร์โทร, role',
      'ระบบรองรับ Username หรือ Email ในการล็อกอิน',
    ],
  },
  {
    id: 'a5', icon: '📊', title: 'ดูรายงานและสถิติ',
    steps: [
      'แท็บ "แดชบอร์ด" แสดงสถิติการจองรายเดือน',
      'ดูจำนวนการจองตามห้อง, ตามสถานะ, ตามช่วงเวลา',
      'Export ข้อมูลการจองได้จากตารางรายการ (คลิกขวา → Copy)',
      'กรองข้อมูลตาม: วันที่, ห้อง, สถานะ, ชื่อผู้จอง',
    ],
  },
  {
    id: 'a6', icon: '⚙️', title: 'การตั้งค่าระบบ',
    steps: [
      'แก้ไขข้อมูลห้องประชุมได้ทันทีผ่านแท็บ "ห้องประชุม"',
      'เพิ่ม/แก้ไข field ในฟอร์มการจอง: แก้ไขไฟล์ BookingFormSheets.jsx',
      'ปรับ time slots ที่ให้จอง: แก้ไข TIME_SLOTS ในไฟล์ utils/helpers.js',
      'ตั้ง LINE Notify token ใน server/.env เพื่อรับแจ้งเตือนเมื่อมีการจองใหม่',
    ],
  },
];

function GuideCard({ item, expanded, onToggle }) {
  return (
    <div className="rounded-2xl border transition-all overflow-hidden"
      style={{ border: expanded ? '1.5px solid #14b8a6' : '1.5px solid #e2e8f0', background: 'white' }}>
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 cursor-pointer bg-transparent border-none"
        style={{ fontFamily: 'Sarabun, sans-serif' }}
      >
        <span className="text-2xl flex-shrink-0">{item.icon}</span>
        <span className="flex-1 font-semibold text-gray-800 text-base">{item.title}</span>
        <span className="text-gray-400 text-lg transition-transform"
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
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between" style={{ height: 72 }}>
            <button onClick={() => navigate('/')} className="flex items-center gap-3 bg-transparent border-none cursor-pointer text-white">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <img src={logo} alt="โลโก้" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-[17px] leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>เทศบาลตำบลบ้านคลอง</div>
                <div className="text-[12px] opacity-85" style={{ fontFamily: 'Sarabun, sans-serif' }}>คู่มือการใช้งานระบบจองห้องประชุม</div>
              </div>
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none transition-all"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'Sarabun, sans-serif' }}>
              📅 จองห้องประชุม
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-3xl text-gray-800 mb-2" style={{ fontFamily: 'Prompt, sans-serif' }}>
            📖 คู่มือการใช้งาน
          </h1>
          <p className="text-gray-500 text-base" style={{ fontFamily: 'Sarabun, sans-serif' }}>
            ระบบจองห้องประชุม เทศบาลตำบลบ้านคลอง จ.พิษณุโลก
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-8 max-w-md mx-auto">
          <button
            onClick={() => setTab('user')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              fontFamily: 'Sarabun, sans-serif',
              background: tab === 'user' ? 'white' : 'transparent',
              color: tab === 'user' ? '#0d9488' : '#64748b',
              boxShadow: tab === 'user' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}>
            👤 สำหรับผู้ใช้งานทั่วไป
          </button>
          <button
            onClick={() => setTab('admin')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer"
            style={{
              fontFamily: 'Sarabun, sans-serif',
              background: tab === 'admin' ? 'white' : 'transparent',
              color: tab === 'admin' ? '#0d9488' : '#64748b',
              boxShadow: tab === 'admin' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}>
            🛡️ สำหรับเจ้าหน้าที่/แอดมิน
          </button>
        </div>

        {/* User guide */}
        {tab === 'user' && (
          <div className="space-y-3 animate-fade-in">
            <div className="p-4 rounded-2xl mb-5 text-sm flex gap-3 items-start"
              style={{ background: '#f0fdf9', border: '1px solid #99f6e4', fontFamily: 'Sarabun, sans-serif' }}>
              <span className="text-2xl">💡</span>
              <div className="text-teal-800">
                <div className="font-bold mb-1">สำหรับผู้ใช้งานทั่วไป</div>
                <div>ไม่ต้องสมัครสมาชิก — สามารถจองห้องประชุมได้ทันทีโดยกรอกชื่อและเบอร์โทรศัพท์
                  การจองจะมีผลหลังจากเจ้าหน้าที่อนุมัติ</div>
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
              <span className="text-2xl">🛡️</span>
              <div className="text-amber-800">
                <div className="font-bold mb-1">สำหรับเจ้าหน้าที่และผู้ดูแลระบบ</div>
                <div>ต้องเข้าสู่ระบบที่หน้า Admin ก่อน — บัญชีเริ่มต้น: <strong>admin / admin123</strong> หรือ <strong>jeng / jeng</strong></div>
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
              className="p-5 rounded-2xl text-left border transition-all cursor-pointer border-none hover:shadow-md"
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
      <footer className="text-center py-8 text-gray-400 text-xs" style={{ fontFamily: 'Sarabun, sans-serif' }}>
        เทศบาลตำบลบ้านคลอง อ.เมือง จ.พิษณุโลก · ระบบจองห้องประชุม
      </footer>
    </div>
  );
}
