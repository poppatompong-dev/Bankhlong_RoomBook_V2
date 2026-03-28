import { useState, useEffect, useRef } from 'react';
import { bookingsAPI } from '../../services/api';

function formatDateTH(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

function getTimeUntil(dateStr, startTime) {
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = startTime.split(':').map(Number);
  const target = new Date(y, m - 1, d, h, min);
  const diffMs = target - now;
  if (diffMs < 0) return null; // past
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `อีก ${diffMins} นาที`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `อีก ${diffHrs} ชั่วโมง`;
  const diffDays = Math.floor(diffHrs / 24);
  return `อีก ${diffDays} วัน`;
}

export default function BookingTicker() {
  const [items, setItems] = useState([]);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  const fetchUpcoming = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await bookingsAPI.list({ status: 'approved', limit: 100 });
      const all = res.data.bookings || [];
      const now = new Date();

      const upcoming = all
        .filter(b => {
          if (b.status === 'cancelled') return false;
          if (b.date < today) return false;
          // if today, only show future
          if (b.date === today) {
            const [h, m] = b.endTime.split(':').map(Number);
            const end = new Date();
            end.setHours(h, m, 0, 0);
            return end > now;
          }
          return true;
        })
        .sort((a, b) => {
          const dtA = a.date + 'T' + a.startTime;
          const dtB = b.date + 'T' + b.startTime;
          return dtA.localeCompare(dtB);
        })
        .slice(0, 20);

      setItems(upcoming);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchUpcoming();
    const interval = setInterval(fetchUpcoming, 60000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  // Build ticker text items
  const tickerItems = items.map((b, i) => {
    const until = getTimeUntil(b.date, b.startTime);
    const urgency = (() => {
      if (!until) return 'normal';
      if (until.includes('นาที')) return 'urgent';
      if (until.includes('ชั่วโมง')) return 'soon';
      return 'normal';
    })();
    return { ...b, until, urgency, key: b._id || i };
  });

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
        borderBottom: '1px solid rgba(20,184,166,0.3)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label badge */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 14px',
        height: '100%',
        background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1,
      }}>
        <span style={{ fontSize: 13, color: 'white', fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap', fontFamily: 'Prompt, sans-serif' }}>
          📅 การจองที่กำลังจะมาถึง
        </span>
      </div>

      {/* Fade left */}
      <div style={{
        position: 'absolute', left: 168, top: 0, bottom: 0, width: 32,
        background: 'linear-gradient(90deg, #1e293b, transparent)',
        zIndex: 1, pointerEvents: 'none'
      }} />

      {/* Scrolling track */}
      <div style={{ overflow: 'hidden', flex: 1, height: '100%', position: 'relative' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            whiteSpace: 'nowrap',
            animation: `ticker-scroll ${Math.max(tickerItems.length * 8, 40)}s linear infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
          {/* Duplicate for seamless loop */}
          {[...tickerItems, ...tickerItems].map((b, idx) => (
            <span key={`${b.key}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
              {/* Divider */}
              <span style={{ color: '#4b5563', margin: '0 16px', fontSize: 14 }}>◆</span>

              {/* Urgency dot */}
              <span style={{
                display: 'inline-block',
                width: 7, height: 7,
                borderRadius: '50%',
                marginRight: 8,
                background: b.urgency === 'urgent' ? '#ef4444' : b.urgency === 'soon' ? '#f59e0b' : '#14b8a6',
                boxShadow: b.urgency === 'urgent' ? '0 0 6px #ef4444' : b.urgency === 'soon' ? '0 0 6px #f59e0b' : '0 0 4px #14b8a6',
                animation: b.urgency !== 'normal' ? 'ticker-pulse 1.2s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }} />

              {/* Room icon + name */}
              <span style={{ color: '#e2e8f0', fontFamily: 'Prompt, sans-serif', fontSize: 13, fontWeight: 600 }}>
                {b.roomIcon || '🏢'} {b.room || 'ห้องประชุม'}
              </span>

              {/* Separator */}
              <span style={{ color: '#4b5563', margin: '0 8px', fontSize: 11 }}>|</span>

              {/* Date + Time */}
              <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Sarabun, sans-serif' }}>
                {formatDateTH(b.date)}
              </span>
              <span style={{ color: '#64748b', margin: '0 5px', fontSize: 11 }}>•</span>
              <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700, fontFamily: 'Prompt, sans-serif' }}>
                {b.startTime}–{b.endTime} น.
              </span>

              {/* Requester */}
              <span style={{ color: '#4b5563', margin: '0 8px', fontSize: 11 }}>|</span>
              <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'Sarabun, sans-serif' }}>
                {b.name || 'ผู้จอง'}
                {b.dept ? ` · ${b.dept}` : ''}
              </span>

              {/* Purpose */}
              <span style={{ color: '#4b5563', margin: '0 8px', fontSize: 11 }}>|</span>
              <span style={{ color: '#cbd5e1', fontSize: 12, fontFamily: 'Sarabun, sans-serif', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'middle' }}>
                {b.purpose}
              </span>

              {/* Time until badge */}
              {b.until && (
                <>
                  <span style={{ color: '#4b5563', margin: '0 8px', fontSize: 11 }}>|</span>
                  <span style={{
                    background: b.urgency === 'urgent' ? 'rgba(239,68,68,0.2)' : b.urgency === 'soon' ? 'rgba(245,158,11,0.2)' : 'rgba(20,184,166,0.15)',
                    color: b.urgency === 'urgent' ? '#fca5a5' : b.urgency === 'soon' ? '#fcd34d' : '#5eead4',
                    padding: '1px 8px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'Prompt, sans-serif',
                    border: `1px solid ${b.urgency === 'urgent' ? 'rgba(239,68,68,0.4)' : b.urgency === 'soon' ? 'rgba(245,158,11,0.4)' : 'rgba(20,184,166,0.3)'}`,
                  }}>
                    {b.until}
                  </span>
                </>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Fade right */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
        background: 'linear-gradient(270deg, #0f172a, transparent)',
        zIndex: 1, pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ticker-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
