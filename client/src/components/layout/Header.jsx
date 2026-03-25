import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const NAV_ITEMS = [
  { path: '/', label: 'แดชบอร์ด', icon: '🏠' },
  { path: '/bookings', label: 'การจองของฉัน', icon: '📋' },
  { path: '/analytics', label: 'สถิติ', icon: '📊' },
  { path: '/settings', label: 'การตั้งค่า', icon: '⚙️' }
];

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-[100] text-white" style={{
      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
      boxShadow: '0 4px 20px rgba(13,148,136,0.4)'
    }}>
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            🏢
          </div>
          <div>
            <div className="font-prompt text-lg font-semibold leading-tight">Smart Meeting Room Booking</div>
            <div className="text-xs opacity-85">ระบบจองห้องประชุมอัจฉริยะ</div>
          </div>
        </div>

        <nav className="hidden md:flex gap-1">
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all no-underline text-white
                ${location.pathname === item.path ? 'bg-white/25' : 'hover:bg-white/15'}`}>
              {item.icon} {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin"
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all no-underline text-white
                ${location.pathname === '/admin' ? 'bg-white/25' : 'hover:bg-white/15'}`}>
              🛡️ แอดมิน
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-xs opacity-85">{connected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div className="text-xs">
              <div className="font-semibold">{user?.name}</div>
              <div className="opacity-75">{user?.role === 'admin' ? '👑 ผู้ดูแล' : '👤 ผู้ใช้'}</div>
            </div>
          </div>
          <button onClick={logout}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 transition-all border-none text-white cursor-pointer">
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex gap-1 px-4 pb-3 overflow-x-auto">
        {NAV_ITEMS.map(item => (
          <Link key={item.path} to={item.path}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-all no-underline text-white
              ${location.pathname === item.path ? 'bg-white/25' : 'hover:bg-white/15'}`}>
            {item.icon} {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin"
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-all no-underline text-white
              ${location.pathname === '/admin' ? 'bg-white/25' : 'hover:bg-white/15'}`}>
            🛡️ แอดมิน
          </Link>
        )}
      </div>
    </header>
  );
}
