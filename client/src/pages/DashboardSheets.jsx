import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Calendar from '../components/calendar/Calendar';
import BookingFormSheets from '../components/booking/BookingFormSheets';
import { formatDateTH, today } from '../utils/helpers';

const api = axios.create({ baseURL: '/api' });

// ─── SVG Watermark ────────────────────────────────────────────────────────────
function Watermark() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ opacity: 0.03 }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wm" x="0" y="0" width="320" height="320" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)">
            <text x="10" y="40" fill="#0d9488" fontSize="16" fontFamily="Prompt,sans-serif" fontWeight="700">เทศบาลตำบลบ้านคลอง</text>
            <text x="30" y="70" fill="#0d9488" fontSize="12" fontFamily="Sarabun,sans-serif">ระบบจองห้องประชุม</text>
            <text x="160" y="160" fill="#0d9488" fontSize="42" fontFamily="serif">🏛️</text>
            <text x="50" y="220" fill="#14b8a6" fontSize="14" fontFamily="Prompt,sans-serif" fontWeight="600">จ.พิษณุโลก</text>
            <text x="10" y="260" fill="#14b8a6" fontSize="11" fontFamily="Sarabun,sans-serif">Meeting Room Booking</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wm)" />
      </svg>
    </div>
  );
}

// ─── Marquee Ticker ───────────────────────────────────────────────────────────
function BookingTicker({ bookings }) {
  const recent = useMemo(() => {
    return bookings
      .filter(b => b.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15);
  }, [bookings]);

  if (recent.length === 0) return null;

  const items = recent.map(b => (
    `⚡ ${b.name} จอง${b.room} (${b.date.split('-').reverse().join('/')} ${b.startTime}–${b.endTime})`
  ));
  // Duplicate for seamless loop
  const text = items.join('     ·     ');

  return (
    <div className="overflow-hidden" style={{
      background: 'linear-gradient(90deg, #f0fdf4, #ccfbf1, #f0fdf4)',
      borderBottom: '1px solid #dcf5e7'
    }}>
      <div className="ticker-wrap">
        <div className="ticker-content" style={{ fontFamily: 'Sarabun, sans-serif' }}>
          <span className="ticker-text">{text}</span>
          <span className="ticker-text">&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;{text}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function DashHeader({ navigate }) {
  return (
    <header className="sticky top-0 z-50 text-white" style={{
      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
      boxShadow: '0 4px 20px rgba(13,148,136,0.4)'
    }}>
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-between" style={{ height: 72 }}>
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer bg-transparent border-none text-white flex-shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              🏛️
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-bold text-[18px] leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>เทศบาลตำบลบ้านคลอง</div>
              <div className="text-[12px] opacity-85" style={{ fontFamily: 'Sarabun, sans-serif' }}>ระบบจองห้องประชุม · จ.พิษณุโลก</div>
            </div>
          </button>

          {/* Right */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></div>
              <span className="text-xs opacity-85 hidden sm:inline" style={{ fontFamily: 'Sarabun, sans-serif' }}>Live</span>
            </div>
            <button onClick={() => navigate('/admin')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border-none text-white"
              style={{ background: 'rgba(255,255,255,0.15)', fontFamily: 'Sarabun, sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              🛡️ ผู้ดูแลระบบ
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[300]">
      <div className={`toast toast-${toast.type}`} style={{ fontFamily: 'Sarabun, sans-serif' }}>{toast.msg}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE — จองห้องประชุม (user-facing only)
// ═══════════════════════════════════════════════════════════════════════════════
function BookingPage({ rooms, allBookings, loading, selectedDate, setSelectedDate, showToast, refetch }) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const bookingsForDate = useMemo(() =>
    allBookings.filter(b => b.date === selectedDate && b.status !== 'cancelled'),
    [allBookings, selectedDate]);

  const getRoomBookings = (roomName) => bookingsForDate.filter(b => b.room === roomName);
  const hasAnyBooking = (roomName) => getRoomBookings(roomName).length > 0;
  const availableCount = rooms.filter(r => !hasAnyBooking(r.name)).length;

  const handleBook = async (formData) => {
    try {
      await api.post('/bookings', formData);
      showToast('⚡ จองห้องประชุมสำเร็จ! มีผลทันที', 'success');
      setShowForm(false);
      setSelectedRoom(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาดในการจอง', 'error');
      throw err;
    }
  };

  // Quick book: select date + open form
  const handleQuickBook = (dateStr) => {
    setSelectedDate(dateStr);
    setSelectedRoom(null);
    setShowForm(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="loader border-teal-500 border-t-white mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
        <p className="text-gray-400 text-sm" style={{ fontFamily: 'Sarabun, sans-serif' }}>กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in relative z-[1]">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>�️ จองห้องประชุม</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>
            วันที่ {formatDateTH(selectedDate)} · ว่าง {availableCount} จาก {rooms.length} ห้อง · <span style={{ color: '#14b8a6', fontWeight: 600 }}>จองมีผลทันที</span>
          </p>
        </div>
        <button className="btn-primary btn-lg" onClick={() => { setSelectedRoom(null); setShowForm(true); }}>
          ⚡ จองห้องประชุม
        </button>
      </div>

      {/* Two-column: Calendar + Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 ปฏิทิน</div>
            <span className="badge badge-info" style={{ fontFamily: 'Sarabun, sans-serif' }}>คลิกเพื่อจองด่วน</span>
          </div>
          <div className="card-body">
            <Calendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              bookings={allBookings}
              onQuickBook={handleQuickBook}
            />
            <div className="mt-4 p-3 rounded-xl text-sm font-medium flex items-center justify-between" style={{ background: '#ccfbf1', color: '#0f766e', fontFamily: 'Sarabun, sans-serif' }}>
              <span>📌 วันที่เลือก: <strong>{formatDateTH(selectedDate)}</strong></span>
              <button
                onClick={() => handleQuickBook(selectedDate)}
                className="text-xs px-3 py-1 rounded-lg font-semibold cursor-pointer border-none text-white"
                style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)', fontFamily: 'Sarabun, sans-serif' }}
              >⚡ จองวันนี้</button>
            </div>
          </div>
        </div>

        {/* Room cards */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏢 ห้องประชุม</div>
            <span className="badge badge-success" style={{ fontFamily: 'Sarabun, sans-serif' }}>{availableCount} ว่าง</span>
          </div>
          <div className="card-body p-4">
            <div className="flex flex-col gap-3">
              {rooms.map(room => {
                const rb = getRoomBookings(room.name);
                const booked = rb.length > 0;
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <div key={room.id}
                    onClick={() => { setSelectedRoom(room); setShowForm(true); }}
                    className={`room-card ${booked ? 'booked' : 'available'} ${isSelected ? 'selected' : ''}`}
                    style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    {(isSelected || !booked) && (
                      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'linear-gradient(90deg, #2dd4bf, #4ec07a)' }} />
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl flex-shrink-0">{room.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800 leading-snug" style={{ fontFamily: 'Sarabun, sans-serif' }}>{room.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>👥 {room.capacity} ที่นั่ง · ชั้น {room.floor}</div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                        style={booked ? { background: '#fee2e2', color: '#ef4444' } : { background: '#dcf5e7', color: '#1c8646' }}>
                        {booked ? `📌 ${rb.length} จอง` : '✅ ว่าง'}
                      </span>
                    </div>
                    {rb.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rb.map(b => (
                          <span key={b.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'Sarabun, sans-serif' }}>
                            {b.startTime}–{b.endTime} · {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {showForm && (
        <BookingFormSheets
          rooms={rooms}
          selectedDate={selectedDate}
          selectedRoom={selectedRoom}
          bookings={bookingsForDate}
          onBook={handleBook}
          onClose={() => { setShowForm(false); setSelectedRoom(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SHELL
// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardSheets() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/bookings'),
      ]);
      setRooms(roomsRes.data.rooms || []);
      setAllBookings(bookingsRes.data.bookings || []);
    } catch {
      showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const iv = setInterval(fetchData, 8000);
    return () => clearInterval(iv);
  }, [fetchData]);

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #f0faf4 0%, #f0fdf9 50%, #ffffff 100%)' }}>
      <Watermark />
      <DashHeader navigate={navigate} />
      <BookingTicker bookings={allBookings} />
      <main className="max-w-[1400px] mx-auto px-6 py-6 relative z-[1]">
        <BookingPage
          rooms={rooms}
          allBookings={allBookings}
          loading={loading}
          showToast={showToast}
          refetch={fetchData}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </main>
      <Toast toast={toast} />
    </div>
  );
}

