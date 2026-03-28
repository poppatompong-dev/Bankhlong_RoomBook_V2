import { useState, useMemo } from 'react';
import { THAI_MONTHS, THAI_DAYS, today } from '../../utils/helpers';

const ROOM_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#6366f1'];
const TIME_LABELS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function buildRoomColorMap(bookings) {
  const map = {};
  let idx = 0;
  bookings.forEach(b => {
    const key = b.room || b.roomId;
    if (b.status !== 'cancelled' && key && !map[key]) map[key] = ROOM_COLORS[idx++ % ROOM_COLORS.length];
  });
  return map;
}

function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${parseInt(y)+543}`;
}

/* ─────────────────────────────────────────────
   HOVER TOOLTIP (position:fixed — ไม่ถูก clip)
───────────────────────────────────────────── */
function HoverTooltip({ tooltip, roomColorMap }) {
  if (!tooltip) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = 270;
  const rows = tooltip.confirmed.length;
  const tipH = rows === 0 ? 90 : Math.min(rows * 60 + 58, 290);

  let tx = tooltip.x - tipW / 2;
  if (tx < 8) tx = 8;
  if (tx + tipW > vw - 8) tx = vw - tipW - 8;

  let ty = tooltip.y + 10;
  if (ty + tipH > vh - 12) ty = tooltip.y - tipH - 10;

  return (
    <div style={{
      position: 'fixed', left: tx, top: ty, width: tipW, zIndex: 99999,
      background: 'white', borderRadius: 14,
      boxShadow: '0 8px 30px rgba(0,0,0,0.20)', border: '1px solid #e2e8f0',
      overflow: 'hidden', pointerEvents: 'none'
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', padding: '8px 14px' }}>
        <div style={{ color: 'white', fontFamily: 'Prompt', fontWeight: 700, fontSize: 12 }}>
          📅 {formatDateFull(tooltip.dateStr)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 }}>
          {rows === 0 ? 'ว่างทั้งวัน — คลิกเพื่อจองห้อง' : `${rows} การจอง · คลิกเพื่อจองเพิ่ม`}
        </div>
      </div>
      {/* Body */}
      {rows === 0 ? (
        <div style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 11, textAlign: 'center', fontFamily: 'Sarabun' }}>
          🕊️ ไม่มีการจอง
        </div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
          {tooltip.confirmed.map((b, bi) => {
            const color = roomColorMap[b.room || b.roomId] || '#14b8a6';
            return (
              <div key={bi} style={{
                display: 'flex', gap: 8, padding: '7px 14px',
                borderBottom: bi < rows - 1 ? '1px solid #f1f5f9' : 'none', alignItems: 'flex-start'
              }}>
                <div style={{ width: 3, flexShrink: 0, borderRadius: 2, background: color, alignSelf: 'stretch', minHeight: 28 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', fontFamily: 'Sarabun', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name || b.requesterName || 'ไม่ระบุ'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {b.startTime}–{b.endTime}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1, fontFamily: 'Sarabun', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.roomIcon || '🏢'} {b.room}{b.purpose ? ` · ${b.purpose}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MONTH VIEW
───────────────────────────────────────────── */
function MonthView({ year, month, selected, onSelect, bookings, roomColorMap }) {
  const [tooltip, setTooltip] = useState(null);
  const todayStr = today();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => { if (!map[b.date]) map[b.date] = []; map[b.date].push(b); });
    return map;
  }, [bookings]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="select-none">
      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {THAI_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 py-1 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ aspectRatio: '1' }} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isPast   = dateStr < todayStr;
          const isToday  = dateStr === todayStr;
          const isSel    = dateStr === selected;
          const isHov    = tooltip?.dateStr === dateStr;
          const confirmed = (byDate[dateStr] || []).filter(b => b.status !== 'cancelled');
          const hasBook   = confirmed.length > 0;
          const dotColor  = confirmed.length >= 4 ? '#ef4444' : confirmed.length >= 2 ? '#f59e0b' : '#14b8a6';
          const uniqueRooms = [...new Set(confirmed.map(b => b.room || b.roomId))];

          let cellStyle = { aspectRatio: '1', minHeight: 40, cursor: isPast ? 'not-allowed' : 'pointer' };
          if (isPast)       cellStyle = { ...cellStyle, color: '#d1d5db' };
          else if (isSel)   cellStyle = { ...cellStyle, background: 'linear-gradient(135deg,#14b8a6,#0d9488)', color: 'white', fontWeight: 700, boxShadow: '0 2px 10px rgba(20,184,166,0.45)' };
          else if (isHov)   cellStyle = { ...cellStyle, background: '#f0fdf4', border: `1.5px solid ${hasBook ? dotColor+'99' : '#86efac'}`, color: '#0f766e', fontWeight: 600 };
          else if (isToday) cellStyle = { ...cellStyle, background: '#f0fdf4', color: '#16a34a', fontWeight: 700, border: '2px solid #86efac' };
          else              cellStyle = { ...cellStyle, border: `1px solid ${hasBook ? dotColor+'40' : 'transparent'}`, background: hasBook ? dotColor+'08' : undefined, color: '#374151' };

          return (
            <div key={d}
              className="flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all"
              style={cellStyle}
              onClick={() => { if (!isPast) { setTooltip(null); onSelect(dateStr); } }}
              onMouseEnter={e => {
                if (isPast) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ dateStr, x: rect.left + rect.width / 2, y: rect.bottom, confirmed });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span style={{ fontSize: 13 }}>{d}</span>
              {hasBook && !isSel && (
                <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                  {uniqueRooms.slice(0, 3).map((rm, ri) => (
                    <span key={ri} style={{ width: 5, height: 5, borderRadius: '50%', background: roomColorMap[rm] || dotColor, display: 'block' }} />
                  ))}
                  {uniqueRooms.length > 3 && <span style={{ fontSize: 7, color: '#94a3b8' }}>+</span>}
                </div>
              )}
              {isSel && hasBook && (
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>{confirmed.length}✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed tooltip */}
      <HoverTooltip tooltip={tooltip} roomColorMap={roomColorMap} />

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 pt-3 flex-wrap gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-4">
          {[{ color: '#14b8a6', label: '1 จอง' }, { color: '#f59e0b', label: '2-3 จอง' }, { color: '#ef4444', label: '4+ จอง' }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun' }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Sarabun' }}>Hover เพื่อดูรายละเอียด · คลิกเพื่อจอง</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WEEK VIEW
───────────────────────────────────────────── */
function WeekView({ selectedDate, onSelect, bookings, onQuickBook, roomColorMap }) {
  const todayStr = today();
  const base = selectedDate || todayStr;
  const baseDate = new Date(base);
  const dow = baseDate.getDay();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dow + i);
    return d.toISOString().slice(0, 10);
  });

  const byDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => { if (!map[b.date]) map[b.date] = []; map[b.date].push(b); });
    return map;
  }, [bookings]);

  const DAY_NAMES = ['อา','จ','อ','พ','พฤ','ศ','ส'];

  return (
    <div className="select-none overflow-x-auto">
      <div style={{ minWidth: 400 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          <div />
          {weekDays.map((d, i) => {
            const isToday = d === todayStr;
            const isSel   = d === selectedDate;
            const cnt     = (byDate[d] || []).filter(b => b.status !== 'cancelled').length;
            return (
              <div key={d} onClick={() => onSelect(d)} className="cursor-pointer text-center rounded-xl py-2 transition-all"
                style={{ background: isSel ? 'linear-gradient(135deg,#14b8a6,#0d9488)' : isToday ? '#f0fdf4' : 'white', border: `1.5px solid ${isSel ? 'transparent' : isToday ? '#86efac' : '#e2e8f0'}` }}>
                <div style={{ fontSize: 10, color: isSel ? 'rgba(255,255,255,0.8)' : '#94a3b8', fontFamily: 'Prompt', fontWeight: 600 }}>{DAY_NAMES[i]}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isSel ? 'white' : isToday ? '#16a34a' : '#374151', fontFamily: 'Prompt' }}>{parseInt(d.slice(8))}</div>
                {cnt > 0 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.7)' : '#14b8a6', margin: '2px auto 0' }} />}
              </div>
            );
          })}
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          {TIME_LABELS.slice(0, 24).map(t => (
            <div key={t} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7,1fr)', gap: 2, minHeight: 36, borderBottom: '1px solid #f8fafc' }}>
              <div style={{ padding: '8px 4px', fontSize: 9, color: '#94a3b8', textAlign: 'right', fontFamily: 'Prompt', fontWeight: 600 }}>{t}</div>
              {weekDays.map(d => {
                const bks = (byDate[d] || []).filter(b => b.status !== 'cancelled' && b.startTime <= t && b.endTime > t);
                const isPast = d < todayStr;
                return (
                  <div key={d} onClick={() => !isPast && onQuickBook?.(d)}
                    className={`relative ${!isPast ? 'hover:bg-teal-50 cursor-pointer' : ''}`}
                    style={{ background: bks.length > 0 ? (roomColorMap[bks[0]?.room || bks[0]?.roomId] || '#14b8a6') + '20' : undefined }}>
                    {bks.map((bk, bi) => bk.startTime === t && (
                      <div key={bi} style={{ position: 'absolute', inset: '1px 2px', borderRadius: 4, background: roomColorMap[bk.room || bk.roomId] || '#14b8a6', opacity: 0.9, padding: '2px 4px', zIndex: 1, overflow: 'hidden' }}>
                        <div style={{ color: 'white', fontSize: 9, fontWeight: 700, fontFamily: 'Sarabun', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.room}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DAY VIEW
───────────────────────────────────────────── */
function DayView({ selectedDate, onSelect, bookings, onQuickBook, roomColorMap }) {
  const todayStr = today();
  const dateStr  = selectedDate || todayStr;
  const dayBk    = useMemo(() => bookings.filter(b => b.date === dateStr && b.status !== 'cancelled').sort((a, b) => a.startTime.localeCompare(b.startTime)), [bookings, dateStr]);
  const isPast   = dateStr < todayStr;

  const shift = (n) => { const d = new Date(dateStr); d.setDate(d.getDate() + n); onSelect(d.toISOString().slice(0, 10)); };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-100" style={{ border: '1.5px solid #e2e8f0' }}>‹</button>
        <div className="text-center">
          <div className="font-prompt font-bold text-gray-800 text-sm">{formatDateFull(dateStr)}</div>
          {dateStr === todayStr && <div className="text-xs text-teal-600 font-semibold">วันนี้</div>}
        </div>
        <button onClick={() => shift(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-100" style={{ border: '1.5px solid #e2e8f0' }}>›</button>
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {TIME_LABELS.slice(0, 24).map(t => {
          const cellBks   = dayBk.filter(b => b.startTime <= t && b.endTime > t);
          const startsHere = dayBk.filter(b => b.startTime === t);
          return (
            <div key={t} style={{ display: 'flex', minHeight: 40, borderBottom: '1px solid #f8fafc' }}>
              <div style={{ width: 52, flexShrink: 0, padding: '10px 6px', fontSize: 10, color: '#94a3b8', textAlign: 'right', fontFamily: 'Prompt', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>{t}</div>
              <div className={`flex-1 relative ${!isPast && cellBks.length === 0 ? 'hover:bg-teal-50 cursor-pointer' : ''}`}
                onClick={() => !isPast && cellBks.length === 0 && onQuickBook?.(dateStr)}>
                {startsHere.map((bk, bi) => {
                  const [sh, sm] = bk.startTime.split(':').map(Number);
                  const [eh, em] = bk.endTime.split(':').map(Number);
                  const dur = (eh * 60 + em - sh * 60 - sm) / 30;
                  return (
                    <div key={bi} style={{ position: 'absolute', top: 2, left: 4, right: 4, height: `${dur * 40 - 4}px`, zIndex: 2, background: roomColorMap[bk.room || bk.roomId] || '#14b8a6', borderRadius: 8, padding: '4px 8px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: 11, fontFamily: 'Sarabun' }}>{bk.room}</div>
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>{bk.startTime}–{bk.endTime}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bk.name} · {bk.purpose}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {!isPast && onQuickBook && (
        <button onClick={() => onQuickBook(dateStr)} className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer border-none"
          style={{ background: 'linear-gradient(135deg,#14b8a6,#0d9488)' }}>
          ⚡ จองห้องวันนี้ ({dayBk.length} การจองในวันนี้)
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN CALENDAR COMPONENT
───────────────────────────────────────────── */
export default function Calendar({ selected, onSelect, bookings = [], onQuickBook }) {
  const [calView, setCalView] = useState('month');
  const [nav, setNav] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const roomColorMap = useMemo(() => buildRoomColorMap(bookings), [bookings]);

  const prevMonth = () => setNav(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setNav(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });

  const shiftWeek = (n) => {
    const base = selected || today();
    const d = new Date(base);
    d.setDate(d.getDate() + n * 7);
    onSelect(d.toISOString().slice(0, 10));
  };

  return (
    <div className="select-none">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {[{ v: 'month', label: 'เดือน' }, { v: 'week', label: 'สัปดาห์' }, { v: 'day', label: 'วัน' }].map(({ v, label }) => (
            <button key={v} onClick={() => setCalView(v)}
              className="px-3 py-1 rounded-md text-xs font-semibold border-none cursor-pointer transition-all"
              style={{ background: calView === v ? 'white' : 'transparent', color: calView === v ? '#0d9488' : '#6b7280', boxShadow: calView === v ? '0 1px 4px rgba(0,0,0,0.10)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {calView === 'month' && (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-50 border border-gray-200">‹</button>
            <span className="font-prompt text-sm font-semibold text-gray-800 whitespace-nowrap">{THAI_MONTHS[nav.month]} {nav.year + 543}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-50 border border-gray-200">›</button>
          </div>
        )}
        {calView === 'week' && (
          <div className="flex items-center gap-2">
            <button onClick={() => shiftWeek(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-50 border border-gray-200">‹</button>
            <span className="font-prompt text-xs font-semibold text-gray-700">สัปดาห์นี้</span>
            <button onClick={() => shiftWeek(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-gray-600 bg-white cursor-pointer hover:bg-gray-50 border border-gray-200">›</button>
          </div>
        )}
        {calView === 'day' && (
          <button onClick={() => setCalView('month')} className="text-xs text-teal-600 hover:underline cursor-pointer bg-transparent border-none">กลับปฏิทิน</button>
        )}
      </div>

      {/* Views */}
      {calView === 'month' && (
        <MonthView year={nav.year} month={nav.month} selected={selected}
          onSelect={(d) => { onSelect(d); }}
          bookings={bookings} roomColorMap={roomColorMap} />
      )}
      {calView === 'week' && (
        <WeekView selectedDate={selected} onSelect={(d) => { onSelect(d); setCalView('day'); }}
          bookings={bookings} onQuickBook={onQuickBook} roomColorMap={roomColorMap} />
      )}
      {calView === 'day' && (
        <DayView selectedDate={selected} onSelect={onSelect}
          bookings={bookings} onQuickBook={onQuickBook} roomColorMap={roomColorMap} />
      )}
    </div>
  );
}
