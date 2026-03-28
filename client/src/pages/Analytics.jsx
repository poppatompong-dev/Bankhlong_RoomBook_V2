import { useState, useEffect, useCallback } from 'react';
import { bookingsAPI, roomsAPI } from '../services/api';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function BarChart({ data, labelKey, valueKey, color = '#14b8a6', maxValue }) {
  const max = maxValue || Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const pct = max > 0 ? (item[valueKey] / max) * 100 : 0;
        return (
          <div key={i}>
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-gray-700 font-medium truncate max-w-[60%]" style={{ fontFamily: 'Sarabun' }}>{item[labelKey]}</span>
              <span className="font-bold text-gray-800 ml-2">{item[valueKey]}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyChart({ data, year }) {
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const found = data.find(d => d._id === key);
    return { month: THAI_MONTHS[i], count: found ? found.count : 0 };
  });
  const maxVal = Math.max(...months12.map(m => m.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {months12.map((m, i) => {
        const pct = (m.count / maxVal) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs font-bold text-gray-700" style={{ fontSize: 9 }}>{m.count > 0 ? m.count : ''}</div>
            <div className="w-full rounded-t-lg transition-all duration-700 relative group"
              style={{ height: `${Math.max(pct, 4)}%`, background: pct > 50 ? '#0d9488' : pct > 20 ? '#14b8a6' : '#99f6e4', minHeight: 4 }}>
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ fontSize: 10 }}>
                {m.month}: {m.count} ครั้ง
              </div>
            </div>
            <div className="text-gray-400" style={{ fontSize: 8, fontFamily: 'Prompt' }}>{m.month}</div>
          </div>
        );
      })}
    </div>
  );
}

function exportToPDF(analytics, rooms, year, month) {
  const title = `รายงานสถิติการจองห้องประชุม - ${month ? `${THAI_MONTHS_FULL[month - 1]} ` : ''}${year + 543}`;
  const now = new Date();
  const dateStr = `${now.getDate()} ${THAI_MONTHS_FULL[now.getMonth()]} ${now.getFullYear() + 543}`;

  const roomRows = (analytics.roomUtilization || []).map(ru =>
    `<tr><td>${ru.room.icon} ${ru.room.name}</td><td style="text-align:center">${ru.bookingCount}</td><td style="text-align:center">${ru.totalHours} ชม.</td></tr>`
  ).join('');

  const deptRows = (analytics.deptBreakdown || []).map(d =>
    `<tr><td>${d.dept}</td><td style="text-align:center">${d.count}</td></tr>`
  ).join('');

  const recentRows = (analytics.recentBookings || []).slice(0, 20).map(b =>
    `<tr><td>${b.date}</td><td>${b.startTime}–${b.endTime}</td><td>${b.roomIcon || '🏢'} ${b.room}</td><td>${b.name}</td><td>${b.dept || '-'}</td><td>${b.purpose || '-'}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Prompt:wght@600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Sarabun',sans-serif; color:#1e293b; padding:24px; font-size:13px; background:#fff; }
  h1 { font-family:'Prompt',sans-serif; font-size:20px; color:#0d9488; margin-bottom:4px; }
  .meta { color:#64748b; font-size:11px; margin-bottom:20px; }
  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .stat-box { border:1.5px solid #e2e8f0; border-radius:10px; padding:12px 16px; text-align:center; }
  .stat-val { font-family:'Prompt',sans-serif; font-size:24px; font-weight:700; color:#0d9488; }
  .stat-lbl { font-size:11px; color:#64748b; margin-top:2px; }
  h2 { font-family:'Prompt',sans-serif; font-size:14px; font-weight:700; color:#1e293b; margin:20px 0 8px; border-bottom:2px solid #0d9488; padding-bottom:4px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f0fdf4; color:#0d9488; font-weight:700; padding:7px 10px; text-align:left; border:1px solid #e2e8f0; }
  td { padding:6px 10px; border:1px solid #f1f5f9; }
  tr:nth-child(even) { background:#f8fafc; }
  .footer { margin-top:32px; text-align:center; color:#94a3b8; font-size:10px; border-top:1px solid #e2e8f0; padding-top:12px; }
</style>
</head>
<body>
<h1>📊 ${title}</h1>
<div class="meta">พิมพ์เมื่อ: ${dateStr} | เทศบาลตำบลบ้านคลอง อ.เมือง จ.พิษณุโลก</div>
<div class="stats-grid">
  <div class="stat-box"><div class="stat-val">${analytics.totalBookings}</div><div class="stat-lbl">การจองทั้งหมด</div></div>
  <div class="stat-box"><div class="stat-val">${analytics.approvedBookings}</div><div class="stat-lbl">อนุมัติแล้ว</div></div>
  <div class="stat-box"><div class="stat-val">${analytics.cancelledBookings}</div><div class="stat-lbl">ยกเลิก</div></div>
  <div class="stat-box"><div class="stat-val">${analytics.peakHours?.[0]?.time || '-'}</div><div class="stat-lbl">ชั่วโมงยอดนิยม</div></div>
</div>
<h2>การใช้งานแต่ละห้องประชุม</h2>
<table><thead><tr><th>ห้องประชุม</th><th style="text-align:center">จำนวนครั้ง</th><th style="text-align:center">ชั่วโมงรวม</th></tr></thead>
<tbody>${roomRows}</tbody></table>
<h2>หน่วยงานที่จองมากที่สุด</h2>
<table><thead><tr><th>หน่วยงาน</th><th style="text-align:center">จำนวนครั้ง</th></tr></thead>
<tbody>${deptRows}</tbody></table>
<h2>รายการจองล่าสุด (20 รายการ)</h2>
<table><thead><tr><th>วันที่</th><th>เวลา</th><th>ห้อง</th><th>ผู้จอง</th><th>หน่วยงาน</th><th>วัตถุประสงค์</th></tr></thead>
<tbody>${recentRows}</tbody></table>
<div class="footer">รายงานนี้สร้างอัตโนมัติโดยระบบจองห้องประชุม เทศบาลตำบลบ้านคลอง | พัฒนาโดยนักวิชาการคอมพิวเตอร์</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) setTimeout(() => w.print(), 800);
}

export default function Analytics() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(0); // 0 = ทั้งปี
  const [analytics, setAnalytics] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { year };
      if (month > 0) params.month = month;
      const [aRes, rRes] = await Promise.all([
        bookingsAPI.analytics(params),
        roomsAPI.list()
      ]);
      setAnalytics(aRes.data);
      setRooms(rRes.data.rooms || []);
    } catch (e) {
      setError(e.response?.data?.message || 'ไม่สามารถโหลดสถิติได้');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const maxRoom = Math.max(...(analytics?.roomUtilization?.map(r => r.bookingCount) || [1]), 1);
  const maxHour = Math.max(...(analytics?.peakHours?.map(h => h.count) || [1]), 1);
  const cancelRate = analytics?.totalBookings > 0
    ? Math.round((analytics.cancelledBookings / analytics.totalBookings) * 100) : 0;

  const filterLabel = month > 0
    ? `${THAI_MONTHS_FULL[month - 1]} ${year + 543}`
    : `ปี ${year + 543}`;

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-prompt text-xl font-bold text-gray-800">📊 สถิติการใช้งาน</h1>
          <p className="text-sm text-gray-400">ข้อมูลการจองห้องประชุม — {filterLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year picker */}
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="form-control py-2 text-sm" style={{ width: 'auto' }}>
            {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
          </select>
          {/* Month picker */}
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="form-control py-2 text-sm" style={{ width: 'auto' }}>
            <option value={0}>ทั้งปี</option>
            {THAI_MONTHS_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <button onClick={fetchData}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white border-none cursor-pointer"
            style={{ background: '#0d9488' }}>
            🔄 โหลด
          </button>
          {analytics && (
            <button onClick={() => exportToPDF(analytics, rooms, year, month > 0 ? month : null)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border-none cursor-pointer transition-all"
              style={{ background: '#1e293b', color: 'white' }}>
              🖨️ พิมพ์รายงาน
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">❌ {error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="loader border-teal-500 border-t-white" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : analytics && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { icon: '📋', label: 'การจองทั้งหมด', value: analytics.totalBookings, sub: filterLabel, color: '#14b8a6', bg: '#f0fdf4' },
              { icon: '✅', label: 'อนุมัติแล้ว', value: analytics.approvedBookings, sub: `${analytics.totalBookings > 0 ? Math.round(analytics.approvedBookings / analytics.totalBookings * 100) : 0}%`, color: '#16a34a', bg: '#f0fdf4' },
              { icon: '❌', label: 'ยกเลิก', value: analytics.cancelledBookings, sub: `${cancelRate}%`, color: '#ef4444', bg: '#fef2f2' },
              { icon: '🏢', label: 'ห้องที่ใช้', value: (analytics.roomUtilization || []).length, sub: `จาก ${rooms.length} ห้อง`, color: '#2563eb', bg: '#eff6ff' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border border-gray-100 shadow-sm" style={{ background: s.bg }}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-prompt text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold text-gray-600 mt-1" style={{ fontFamily: 'Sarabun' }}>{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Monthly Trend */}
          {month === 0 && (
            <div className="card mb-6">
              <div className="card-header"><div className="card-title">📈 แนวโน้มการจองรายเดือน {year + 543}</div></div>
              <div className="card-body">
                <MonthlyChart data={analytics.monthlyTrend || []} year={year} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Room utilization */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">🏢 การใช้งานแต่ละห้อง</div>
              </div>
              <div className="card-body">
                {analytics.roomUtilization?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">ไม่มีข้อมูล</div>
                ) : (
                  <div className="space-y-4">
                    {(analytics.roomUtilization || []).map((ru, i) => {
                      const pct = maxRoom > 0 ? (ru.bookingCount / maxRoom) * 100 : 0;
                      const colors = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];
                      const clr = colors[i % colors.length];
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1.5 text-sm">
                            <span style={{ fontFamily: 'Sarabun' }}>{ru.room.icon} {ru.room.name}</span>
                            <div className="flex gap-3">
                              <span className="font-bold" style={{ color: clr }}>{ru.bookingCount} ครั้ง</span>
                              <span className="text-gray-400 text-xs">{ru.totalHours} ชม.</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: clr }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Peak hours */}
            <div className="card">
              <div className="card-header"><div className="card-title">⏰ ช่วงเวลายอดนิยม</div></div>
              <div className="card-body">
                {analytics.peakHours?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">ไม่มีข้อมูล</div>
                ) : (
                  <BarChart
                    data={analytics.peakHours || []}
                    labelKey="time"
                    valueKey="count"
                    color="#14b8a6"
                    maxValue={maxHour}
                  />
                )}
              </div>
            </div>

            {/* Dept breakdown */}
            <div className="card">
              <div className="card-header"><div className="card-title">🏛️ หน่วยงานที่จองมากที่สุด</div></div>
              <div className="card-body">
                {analytics.deptBreakdown?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">ไม่มีข้อมูล</div>
                ) : (
                  <BarChart
                    data={analytics.deptBreakdown || []}
                    labelKey="dept"
                    valueKey="count"
                    color="#7c3aed"
                    maxValue={Math.max(...(analytics.deptBreakdown?.map(d => d.count) || [1]), 1)}
                  />
                )}
              </div>
            </div>

            {/* Summary info */}
            <div className="card">
              <div className="card-header"><div className="card-title">📌 สรุปภาพรวม</div></div>
              <div className="card-body space-y-3">
                {[
                  { label: 'วันที่จองมากที่สุด', value: DAY_NAMES[analytics.busiestDay] ?? '-' },
                  { label: 'ชั่วโมงยอดนิยม', value: analytics.peakHours?.[0]?.time ? `${analytics.peakHours[0].time} น.` : '-' },
                  { label: 'อัตราการยกเลิก', value: `${cancelRate}%` },
                  { label: 'ห้องถูกจองมากที่สุด', value: analytics.roomUtilization?.[0]?.room?.name ?? '-' },
                  { label: 'หน่วยงานจองมากที่สุด', value: analytics.deptBreakdown?.[0]?.dept ?? '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-500" style={{ fontFamily: 'Sarabun' }}>{label}</span>
                    <span className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Prompt' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card mb-6">
            <div className="card-header"><div className="card-title">🗓️ Heatmap ตามชั่วโมง</div></div>
            <div className="card-body overflow-x-auto">
              <div className="flex flex-wrap gap-2">
                {Object.entries(analytics.hourCounts || {}).sort().map(([time, count]) => {
                  const max2 = Math.max(...Object.values(analytics.hourCounts || {}), 1);
                  const intensity = count / max2;
                  return (
                    <div key={time} className="text-center" title={`${time}: ${count} ครั้ง`}>
                      <div className="text-gray-400 mb-1" style={{ fontSize: 9 }}>{time}</div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{ background: count === 0 ? '#f1f5f9' : `rgba(20,184,166,${0.15 + intensity * 0.85})`, color: intensity > 0.5 ? 'white' : '#334155' }}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent bookings table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">📋 รายการจองล่าสุด</div>
              <button onClick={() => exportToPDF(analytics, rooms, year, month > 0 ? month : null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer"
                style={{ background: '#1e293b', color: 'white' }}>
                🖨️ Export PDF
              </button>
            </div>
            <div className="card-body overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-3">วันที่</th>
                    <th className="p-3">เวลา</th>
                    <th className="p-3">ห้อง</th>
                    <th className="p-3">ผู้จอง</th>
                    <th className="p-3">หน่วยงาน</th>
                    <th className="p-3">วัตถุประสงค์</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.recentBookings || []).map(b => (
                    <tr key={b._id} className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors">
                      <td className="p-3 font-semibold text-teal-700 text-xs whitespace-nowrap">{b.date}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{b.startTime}–{b.endTime}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{b.roomIcon} {b.room}</td>
                      <td className="p-3 text-xs">{b.name}</td>
                      <td className="p-3 text-xs text-gray-500">{b.dept || '-'}</td>
                      <td className="p-3 text-xs text-gray-600 max-w-xs truncate">{b.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
