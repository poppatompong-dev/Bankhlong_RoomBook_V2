import { useState, useMemo, useRef, useEffect } from 'react';
import { THAI_MONTHS, THAI_DAYS, today } from '../../utils/helpers';

function BookingTooltip({ bookings, dateStr, anchorRef, onClose }) {
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

  const roomColors = [
    '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a'
  ];
  const roomColorMap = {};
  let colorIdx = 0;
  confirmed.forEach(b => {
    if (!roomColorMap[b.room]) roomColorMap[b.room] = roomColors[colorIdx++ % roomColors.length];
  });

  return (
    <div ref={ref}
      style={{
        position: 'absolute', zIndex: 200, top: '110%', left: '50%', transform: 'translateX(-50%)',
        background: 'white', borderRadius: 14, minWidth: 240, maxWidth: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
        overflow: 'hidden', pointerEvents: 'auto'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '10px 14px' }}>
        <div style={{ color: 'white', fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 13 }}>
          📅 {dateStr.split('-').reverse().join('/')}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Sarabun,sans-serif', marginTop: 2 }}>
          {confirmed.length} การจอง{cancelled.length > 0 ? ` · ${cancelled.length} ยกเลิก` : ''}
        </div>
      </div>
      {confirmed.length === 0 ? (
        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontFamily: 'Sarabun,sans-serif' }}>
          ไม่มีการจองที่ยืนยัน
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
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
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.room}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Calendar({ selected, onSelect, bookings = [] }) {
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
          const confirmedCount = dayBookings.filter(b => b.status !== 'cancelled').length;
          const hasBook = confirmedCount > 0;

          // Dot color: green=1, yellow=2-3, red=4+
          const dotColor = confirmedCount >= 4 ? '#ef4444' : confirmedCount >= 2 ? '#f59e0b' : '#14b8a6';

          const isHovered = hoveredDate === dateStr;
          const cellRef = isHovered ? hoverRef : null;

          return (
            <div key={d}
              ref={cellRef}
              onClick={() => { setHoveredDate(null); if (!isPast) onSelect(dateStr); }}
              onMouseEnter={() => { if (hasBook) setHoveredDate(dateStr); }}
              onMouseLeave={() => setHoveredDate(null)}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all relative
                ${isPast ? 'text-gray-300 cursor-not-allowed' :
                  isSel ? 'text-white font-bold' :
                    isToday ? 'bg-green-100 text-green-600 font-bold' :
                      'text-gray-700 hover:bg-green-50 cursor-pointer'}`}
              style={isSel ? {
                background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                boxShadow: '0 2px 8px rgba(20,184,166,0.4)',
                border: 'none'
              } : {
                border: `1.5px solid ${isToday ? '#86d9a8' : hasBook && !isPast ? dotColor + '55' : 'transparent'}`,
                background: hasBook && !isSel && !isPast ? dotColor + '11' : undefined
              }}>
              {d}
              {hasBook && !isSel && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {[...Array(Math.min(confirmedCount, 3))].map((_, di) => (
                    <span key={di} style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor, display: 'block' }} />
                  ))}
                </div>
              )}
              {isHovered && dayBookings.length > 0 && (
                <BookingTooltip
                  bookings={dayBookings}
                  dateStr={dateStr}
                  anchorRef={hoverRef}
                  onClose={() => setHoveredDate(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
        {[
          { color: '#14b8a6', label: '1 การจอง' },
          { color: '#f59e0b', label: '2-3 การจอง' },
          { color: '#ef4444', label: '4+ การจอง' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun,sans-serif' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
