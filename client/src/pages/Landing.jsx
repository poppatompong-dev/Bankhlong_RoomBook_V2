import { useNavigate } from 'react-router-dom';
import { formatDateTH, today } from '../utils/helpers';
import logo from '../assets/logo.png';

export default function Landing() {
  const navigate = useNavigate();
  const todayStr = formatDateTH(today());

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(160deg, #0d9488 0%, #14b8a6 35%, #2dd4bf 65%, #86d9a8 100%)'
    }}>
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)' }}></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'rgba(255,255,255,0.25)' }}></div>
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.2)' }}></div>
      </div>

      {/* Header bar */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center p-1"
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.35)' }}>
            <img src={logo} alt="โลโก้เทศบาลตำบลบ้านคลอง" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="text-white">
            <div className="font-bold text-base leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>เทศบาลตำบลบ้านคลอง</div>
            <div className="text-xs opacity-80" style={{ fontFamily: 'Sarabun, sans-serif' }}>จ.พิษณุโลก · ระบบจองห้องประชุม</div>
          </div>
        </div>
        <div className="text-white text-xs opacity-80 hidden sm:block" style={{ fontFamily: 'Sarabun, sans-serif' }}>{todayStr}</div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontFamily: 'Sarabun, sans-serif' }}>
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
          ระบบพร้อมใช้งาน
        </div>

        {/* Title */}
        <h1 className="text-white font-bold leading-tight mb-3"
          style={{ fontFamily: 'Prompt, sans-serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
          ระบบจองห้องประชุม
        </h1>
        <p className="text-white text-xl md:text-2xl opacity-90 mb-2"
          style={{ fontFamily: 'Sarabun, sans-serif' }}>
          เทศบาลตำบลบ้านคลอง จังหวัดพิษณุโลก
        </p>
        <p className="text-white opacity-75 text-base max-w-lg mb-10"
          style={{ fontFamily: 'Sarabun, sans-serif' }}>
          จองง่าย ไม่ซ้ำซ้อน ดูห้องว่างได้ทันที — เพราะเวลาราชการ ทุกนาทีมีค่า
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 cursor-pointer border-none"
            style={{
              background: 'white',
              color: '#0d9488',
              fontFamily: 'Sarabun, sans-serif',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              minWidth: '220px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📅</span>
            <span>เริ่มจองห้องประชุม</span>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.4)',
              color: 'white',
              fontFamily: 'Sarabun, sans-serif',
              minWidth: '220px'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🛡️</span>
            <span>สำหรับผู้ดูแลระบบ</span>
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: '⚡', title: 'จองได้ทันที', desc: 'ไม่ต้องรอการอนุมัติ ระบบแจ้งผลแบบ Real-time' },
            { icon: '📊', title: 'ดูห้องว่างง่าย', desc: 'ปฏิทินแสดงสถานะห้องประชุมทุกห้องพร้อมกัน' },
            { icon: '🔒', title: 'ป้องกันซ้ำซ้อน', desc: 'ระบบตรวจสอบและป้องกันการจองทับซ้อนอัตโนมัติ' },
          ].map(f => (
            <div key={f.title}
              className="p-5 rounded-2xl text-center transition-all"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)'
              }}>
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="text-white font-bold text-sm mb-1" style={{ fontFamily: 'Sarabun, sans-serif' }}>{f.title}</div>
              <div className="text-white text-xs opacity-80" style={{ fontFamily: 'Sarabun, sans-serif' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-white" style={{ fontFamily: 'Sarabun, sans-serif' }}>
        <div style={{ opacity: 0.85, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          เทศบาลตำบลบ้านคลอง อ.เมือง จ.พิษณุโลก
        </div>
        <div style={{ opacity: 0.55, fontSize: 11, marginBottom: 2 }}>
          พัฒนาโดย นักวิชาการคอมพิวเตอร์ · กองช่าง เทศบาลตำบลบ้านคลอง
        </div>
        <div style={{ opacity: 0.4, fontSize: 10, fontStyle: 'italic', letterSpacing: '0.5px' }}>
          &ldquo;เขียนโค้ดไม่ได้อยู่ใน JD แต่อยู่ในสายเลือด&rdquo;
        </div>
      </footer>
    </div>
  );
}
