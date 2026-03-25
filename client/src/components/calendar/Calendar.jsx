import { useState, useMemo, useRef, useEffect } from 'react';
import { THAI_MONTHS, THAI_DAYS, today } from '../../utils/helpers';

const ROOM_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#6366f1'];

function buildRoomColorMap(bookings) {
  const map = {};
  let idx = 0;
  bookings.forEach(b => {
    if (b.status !== 'cancelled' && !map[b.room]) map[b.room] = ROOM_COLORS[idx++ % ROOM_COLORS.length];
  });
  return map;
}

function BookingTooltip({ bookings, dateStr, anchorRef, onClose, onQuickBook, roomColorMap }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  const confirmed = bookings.filter(b => b.status !== 'cancelled');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const isPast = dateStr < today();

  return (
    <div ref={ref}
      style={{
        position: 'absolute', zIndex: 200, top: '110%', left: '50%', transform: 'translateX(-50%)',
        background: 'white', borderRadius: 14, minWidth: 260, maxWidth: 320,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
        overflow: 'hidden', pointerEvents: 'auto'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'white', fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 13 }}>
              📅 {dateStr.split('-').reverse().join('/')}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Sarabun,sans-serif', marginTop: 2 }}>
              {confirmed.length} การจอง{cancelled.length > 0 ? ` · ${cancelled.length} ยกเลิก` : ''}
            </div>
          </div>
          {!isPast && onQuickBook && (
            <button
              onClick={() => onQuickBook(dateStr)}
              style={{
                background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)',
                color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 11,
                fontFamily: 'Sarabun,sans-serif', fontWeight: 600, cursor: 'pointer'
              }}
            >⚡ จองด่วน</button>
          )}
        </div>
      </div>
      {confirmed.length === 0 ? (
        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontFamily: 'Sarabun,sans-serif' }}>
          ไม่มีการจอง — ว่างทั้งวัน
        </div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {confirmed.map((b, i) => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 14px',
              borderBottom: i < confirmed.length - 1 ? '1px solid #f1f5f9' : 'none'
            }}>
              <div style={{
                width: 3, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch',
                background: roomColorMap[b.room] || '#14b8a6', minHeight: 36
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11, color: roomColorMap[b.room] || '#0d9488', fontWeight: 600, fontFamily: 'Sarabun,sans-serif', marginTop: 1 }}>
                  {b.startTime}–{b.endTime}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🏢 {b.room}
                </div>
                {b.purpose && (
                  <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                    📝 {b.purpose}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!isPast && onQuickBook && confirmed.length > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <button
            onClick={() => onQuickBook(dateStr)}
            style={{
              background: 'linear-gradient(135deg,#14b8a6,#0d9488)', border: 'none',
              color: 'white', borderRadius: 8, padding: '6px 16px', fontSize: 11,
              fontFamily: 'Sarabun,sans-serif', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(20,184,166,0.3)'
            }}
          >⚡ จองห้องวันนี้</button>
        </div>
      )}
    </div>
  );
}

export default function Calendar({ selected, onSelect, bookings = [], onQuickBook }) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [hoveredDate, setHoveredDate] = useState(null);
  const hoverRef = useRef(null);

  const { year, month } = view;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today();

  const bookingsByDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings]);

  const roomColorMap = useMemo(() => buildRoomColorMap(bookings), [bookings]);

  const prev = () => { setHoveredDate(null); setView(v => ({ year: v.month === 0 ? v.year - 1 : v.year, month: v.month === 0 ? 11 : v.month - 1 })); };
  const next = () => { setHoveredDate(null); setView(v => ({ year: v.month === 11 ? v.year + 1 : v.year, month: v.month === 11 ? 0 : v.month + 1 })); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer transition-all hover:border-teal-400 hover:text-teal-500 hover:bg-green-50"
          style={{ border: '1.5px solid #e2e8f0' }}>‹</button>
        <span className="font-prompt text-base font-semibold text-gray-800">
          {THAI_MONTHS[month]} {year + 543}
        </span>
        <button onClick={next}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer transition-all hover:border-teal-400 hover:text-teal-500 hover:bg-green-50"
          style={{ border: '1.5px solid #e2e8f0' }}>›</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {THAI_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 py-1 uppercase tracking-wider">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="aspect-square"></div>;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isPast = dateStr < todayStr;
          const isToday = dateStr === todayStr;
          const isSel = dateStr === selected;
          const dayBookings = bookingsByDate[dateStr] || [];
          const confirmed = dayBookings.filter(b => b.status !== 'cancelled');
          const confirmedCount = confirmed.length;
          const hasBook = confirmedCount > 0;

          // Dot color: green=1, yellow=2-3, red=4+
          const dotColor = confirmedCount >= 4 ? '#ef4444' : confirmedCount >= 2 ? '#f59e0b' : '#14b8a6';

          // Unique rooms booked this day (max 3 chips shown)
          const uniqueRooms = [...new Set(confirmed.map(b => b.room))];

          const isHovered = hoveredDate === dateStr;
          const cellRef = isHovered ? hoverRef : null;

          return (
            <div key={d}
              ref={cellRef}
              onClick={() => { setHoveredDate(null); if (!isPast) onSelect(dateStr); }}
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              className={`flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all relative
                ${isPast ? 'text-gray-300 cursor-not-allowed' :
                  isSel ? 'text-white font-bold' :
                    isToday ? 'bg-green-100 text-green-600 font-bold' :
                      'text-gray-700 hover:bg-green-50 cursor-pointer'}`}
              style={{
                minHeight: 44,
                ...(isSel ? {
                  background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                  boxShadow: '0 2px 8px rgba(20,184,166,0.4)',
                  border: 'none'
                } : {
                  border: `1.5px solid ${isToday ? '#86d9a8' : hasBook && !isPast ? dotColor + '55' : 'transparent'}`,
                  background: hasBook && !isSel && !isPast ? dotColor + '08' : undefined
                })
              }}>
              <span>{d}</span>
              {hasBook && !isSel && (
                <div className="flex gap-0.5 mt-0.5">
                  {uniqueRooms.slice(0, 3).map((rm, ri) => (
                    <span key={ri} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: roomColorMap[rm] || dotColor, display: 'block'
                    }} />
                  ))}
                  {uniqueRooms.length > 3 && (
                    <span style={{ fontSize: 7, color: '#94a3b8', lineHeight: '5px' }}>+</span>
                  )}
                </div>
              )}
              {isSel && hasBook && (
                <div style={{ fontSize: 8, opacity: 0.85, marginTop: 1 }}>{confirmedCount}</div>
              )}
              {isHovered && (
                <BookingTooltip
                  bookings={dayBookings}
                  dateStr={dateStr}
                  anchorRef={hoverRef}
                  onClose={() => setHoveredDate(null)}
                  onQuickBook={onQuickBook}
                  roomColorMap={roomColorMap}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-4">
          {[
            { color: '#14b8a6', label: '1 จอง' },
            { color: '#f59e0b', label: '2-3 จอง' },
            { color: '#ef4444', label: '4+ จอง' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun,sans-serif' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun,sans-serif' }}>
          คลิกวันที่เพื่อจองด่วน
        </span>
      </div>
    </div>
  );
}
