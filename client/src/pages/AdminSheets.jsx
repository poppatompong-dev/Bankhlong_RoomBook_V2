import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import { formatDateTH, getStatusBadge } from '../utils/helpers';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }) {
  return (
    <div onClick={() => onChange(!enabled)} className="cursor-pointer flex-shrink-0"
      style={{ width: 44, height: 24, borderRadius: 12, background: enabled ? '#14b8a6' : '#cbd5e1', transition: '0.3s', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 3, left: enabled ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        transition: '0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

// ─── Status color dot ──────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed: { dot: '#22c55e', bg: '#dcf5e7', text: '#15803d', label: 'ยืนยัน' },
  cancelled: { dot: '#ef4444', bg: '#fee2e2', text: '#b91c1c', label: 'ยกเลิก' },
};
function StatusDot({ status }) {
  const cfg = STATUS_CFG[status] || { dot: '#94a3b8', bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.text, fontSize: 11, fontWeight: 700, fontFamily: 'Sarabun,sans-serif' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

// ─── View Booking Modal ────────────────────────────────────────────────────────
function ViewModal({ booking, rooms, onClose }) {
  const room = rooms.find(r => r.name === booking.room);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg,#0d9488,#14b8a6)', borderRadius: '16px 16px 0 0', padding: '20px 24px' }}>
          <div className="flex items-center justify-between">
            <div style={{ color: 'white', fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 16 }}>📋 รายละเอียดการจอง</div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Sarabun,sans-serif', marginTop: 4 }}>ID: {booking.id}</div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: '👤 ผู้จอง', value: booking.name },
            { label: '📞 เบอร์โทร', value: booking.phone },
            { label: '🏢 ห้อง', value: `${room?.icon || ''} ${booking.room}` },
            { label: '📅 วันที่', value: formatDateTH(booking.date) },
            { label: '⏰ เวลา', value: `${booking.startTime} – ${booking.endTime} น.` },
            { label: '📝 วัตถุประสงค์', value: booking.purpose },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 12, color: '#64748b', fontFamily: 'Sarabun,sans-serif' }}>{row.label}</div>
              <div style={{ flex: 1, fontSize: 13, color: '#1e293b', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>{row.value}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 130, flexShrink: 0, fontSize: 12, color: '#64748b', fontFamily: 'Sarabun,sans-serif' }}>📌 สถานะ</div>
            <StatusDot status={booking.status} />
          </div>
        </div>
        <div style={{ padding: '0 24px 20px' }}>
          <button onClick={onClose} className="btn-primary w-full" style={{ fontFamily: 'Sarabun,sans-serif' }}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Booking Modal ────────────────────────────────────────────────────────
const TIME_OPTIONS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

function EditModal({ booking, rooms, onSave, onClose, showToast }) {
  const [form, setForm] = useState({ ...booking });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/bookings/${booking.id}`, form);
      showToast('✅ แก้ไขการจองสำเร็จ', 'success');
      onSave();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius: '16px 16px 0 0', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div className="flex items-center justify-between">
            <div style={{ color: 'white', fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 16 }}>✏️ แก้ไขการจอง</div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>✕</button>
          </div>
        </div>
        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ชื่อผู้จอง</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>เบอร์โทร</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} required />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ห้องประชุม</label>
            <select className="form-control" style={{ fontFamily: 'Sarabun,sans-serif' }} value={form.room} onChange={e => set('room', e.target.value)} required>
              {rooms.map(r => <option key={r.id} value={r.name}>{r.icon} {r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>วันที่</label>
            <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>เวลาเริ่ม</label>
              <select className="form-control" style={{ fontFamily: 'Sarabun,sans-serif' }} value={form.startTime} onChange={e => set('startTime', e.target.value)} required>
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>เวลาสิ้นสุด</label>
              <select className="form-control" style={{ fontFamily: 'Sarabun,sans-serif' }} value={form.endTime} onChange={e => set('endTime', e.target.value)} required>
                {TIME_OPTIONS.filter(t => t > form.startTime).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>วัตถุประสงค์</label>
            <input className="form-control" value={form.purpose} onChange={e => set('purpose', e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>สถานะ</label>
            <select className="form-control" style={{ fontFamily: 'Sarabun,sans-serif' }} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="confirmed">✅ ยืนยัน</option>
              <option value="cancelled">❌ ยกเลิก</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun,sans-serif' }} onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving} style={{ fontFamily: 'Sarabun,sans-serif', background: '#2563eb' }}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ booking, onConfirm, onClose, deleting }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🗑️</div>
        <div style={{ fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 8 }}>ลบการจองนี้?</div>
        <div style={{ fontFamily: 'Sarabun,sans-serif', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
          <strong>{booking.name}</strong> · {booking.room}
        </div>
        <div style={{ fontFamily: 'Sarabun,sans-serif', fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
          การกระทำนี้ไม่สามารถย้อนกลับได้
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun,sans-serif' }} disabled={deleting}>ยกเลิก</button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'Sarabun,sans-serif' }}>
            {deleting ? 'กำลังลบ...' : '🗑️ ยืนยันลบ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Smart Export Report ───────────────────────────────────────────────────────
function exportReport(bookings, rooms, mode = 'csv') {
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  if (mode === 'csv') {
    const header = ['#', 'ชื่อ', 'เบอร์โทร', 'ห้อง', 'วันที่', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'วัตถุประสงค์', 'สถานะ', 'วันที่สร้าง'];
    const rows = bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b, i) => [i + 1, b.name, b.phone, b.room, b.date, b.startTime, b.endTime, b.purpose, b.status, b.createdAt]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (mode === 'summary') {
    const roomStats = rooms.map(r => {
      const rb = confirmed.filter(b => b.room === r.name);
      return { name: r.name, icon: r.icon, count: rb.length };
    }).sort((a, b) => b.count - a.count);

    const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const rate = bookings.length > 0 ? Math.round((confirmed.length / bookings.length) * 100) : 0;

    let txt = `📊 รายงานสรุปการจองห้องประชุม\n`;
    txt += `สร้างเมื่อ: ${today}\n`;
    txt += `${'─'.repeat(50)}\n\n`;
    txt += `📋 ภาพรวม\n`;
    txt += `  • รายการทั้งหมด: ${bookings.length} รายการ\n`;
    txt += `  • ยืนยันแล้ว:    ${confirmed.length} รายการ\n`;
    txt += `  • ยกเลิก:         ${cancelled.length} รายการ\n`;
    txt += `  • อัตราการจอง:   ${rate}%\n\n`;
    txt += `🏢 การใช้ห้อง (ยืนยันแล้ว)\n`;
    roomStats.forEach((r, i) => {
      const bar = '█'.repeat(r.count) || '—';
      txt += `  ${i + 1}. ${r.name.padEnd(28)} ${bar} (${r.count})\n`;
    });
    txt += `\n${'─'.repeat(50)}\n`;
    txt += `ระบบ Smart Meeting Room Booking\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Tab: จัดการจอง ────────────────────────────────────────────────────────────
function TabBookings({ bookings, rooms, loading, onRefresh, showToast }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [viewBooking, setViewBooking] = useState(null);
  const [editBooking, setEditBooking] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const filtered = useMemo(() =>
    bookings
      .filter(b => !filterStatus || b.status === filterStatus)
      .filter(b => !filterRoom || b.room === filterRoom)
      .filter(b => !filterDate || b.date === filterDate)
      .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.phone.includes(search) || b.purpose.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [bookings, filterStatus, filterRoom, filterDate, search]);

  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = bookings.filter(b => b.date === todayStr && b.status === 'confirmed').length;
  const rate = bookings.length > 0 ? Math.round((confirmed / bookings.length) * 100) : 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/bookings/${deleteTarget.id}`);
      showToast('🗑️ ลบการจองสำเร็จ', 'success');
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally { setDeleting(false); }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/bookings/${cancelTarget.id}/cancel`);
      showToast('✅ ยกเลิกการจองสำเร็จ', 'success');
      setCancelTarget(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="loader border-teal-500 border-t-white mx-auto" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  const hasFilter = filterStatus || filterRoom || filterDate || search;

  return (
    <div className="animate-fade-in">
      {/* Modals */}
      {viewBooking && <ViewModal booking={viewBooking} rooms={rooms} onClose={() => setViewBooking(null)} />}
      {editBooking && <EditModal booking={editBooking} rooms={rooms} showToast={showToast} onSave={() => { setEditBooking(null); onRefresh(); }} onClose={() => setEditBooking(null)} />}
      {deleteTarget && <DeleteConfirmModal booking={deleteTarget} deleting={deleting} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {cancelTarget && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef3c7', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚠️</div>
            <div style={{ fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 8 }}>ยืนยันการยกเลิก?</div>
            <div style={{ fontFamily: 'Sarabun,sans-serif', fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              <strong>{cancelTarget.name}</strong> · {cancelTarget.room}<br />
              <span style={{ color: '#0d9488' }}>{cancelTarget.startTime}–{cancelTarget.endTime}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun,sans-serif' }} disabled={cancelling}>ไม่ใช่</button>
              <button onClick={handleCancel} disabled={cancelling}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f59e0b', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'Sarabun,sans-serif' }}>
                {cancelling ? 'กำลังยกเลิก...' : '✔ ยืนยันยกเลิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>📊 จัดการการจอง</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>รายการจองทั้งหมด · รีเฟรชทุก 10 วินาที</p>
        </div>
        {/* Export dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExport(p => !p)}
            style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'Sarabun,sans-serif', fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            📥 ออกรายงาน <span style={{ fontSize: 10 }}>▼</span>
          </button>
          {showExport && (
            <div style={{ position: 'absolute', right: 0, top: '110%', background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', zIndex: 50, minWidth: 200, overflow: 'hidden' }}>
              {[
                { icon: '📊', label: 'ส่งออก CSV (ข้อมูลทั้งหมด)', action: () => { exportReport(filtered, rooms, 'csv'); setShowExport(false); } },
                { icon: '📋', label: 'รายงานสรุปอัจฉริยะ (.txt)', action: () => { exportReport(filtered, rooms, 'summary'); setShowExport(false); } },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'Sarabun,sans-serif', fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions Bar ── */}
      <div className="card mb-5" style={{ background: 'linear-gradient(135deg,#0d9488 0%,#14b8a6 100%)', border: 'none' }}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Sarabun,sans-serif', marginBottom: 10 }}>⚡ Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '📅', label: 'วันนี้', action: () => { setFilterDate(todayStr); setFilterStatus(''); setFilterRoom(''); setSearch(''); } },
              { icon: '✅', label: 'ยืนยันทั้งหมด', action: () => { setFilterStatus('confirmed'); setFilterDate(''); setFilterRoom(''); setSearch(''); } },
              { icon: '❌', label: 'ยกเลิกทั้งหมด', action: () => { setFilterStatus('cancelled'); setFilterDate(''); setFilterRoom(''); setSearch(''); } },
              { icon: '🔄', label: 'รีเฟรช', action: onRefresh },
              { icon: '✕', label: 'ล้างทุกตัวกรอง', action: () => { setFilterStatus(''); setFilterDate(''); setFilterRoom(''); setSearch(''); } },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: 12, fontFamily: 'Sarabun,sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { icon: '📋', label: 'ทั้งหมด', value: bookings.length, dot: '#3b82f6', bg: '#dbeafe' },
          { icon: '✅', label: 'ยืนยันแล้ว', value: confirmed, dot: '#22c55e', bg: '#dcf5e7' },
          { icon: '❌', label: 'ยกเลิก', value: cancelled, dot: '#ef4444', bg: '#fee2e2' },
          { icon: '📅', label: 'จองวันนี้', value: todayCount, dot: '#f59e0b', bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.bg, border: 'none', cursor: 'default' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{s.icon}</div>
            <div>
              <div className="font-bold text-[26px] text-gray-800" style={{ fontFamily: 'Prompt,sans-serif', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontFamily: 'Sarabun,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }}></span>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="card mb-5">
        <div style={{ padding: '14px 20px' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, fontFamily: 'Sarabun,sans-serif', color: '#64748b', fontWeight: 600 }}>อัตราการจองสำเร็จ</span>
            <span style={{ fontSize: 13, fontFamily: 'Prompt,sans-serif', fontWeight: 700, color: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444' }}>{rate}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${rate}%`, borderRadius: 99, background: rate >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : rate >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)', transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, fontFamily: 'Sarabun,sans-serif' }}>
            {confirmed} จากทั้งหมด {bookings.length} รายการ
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="card mb-4">
        <div className="card-body py-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 240 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
              <input className="form-control" style={{ paddingLeft: 32, fontFamily: 'Sarabun,sans-serif' }}
                placeholder="ค้นหาชื่อ/วัตถุประสงค์..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {/* Status pills */}
            <div className="flex gap-2 flex-wrap">
              {[{ v: '', l: 'ทั้งหมด' }, { v: 'confirmed', l: '✅ ยืนยัน' }, { v: 'cancelled', l: '❌ ยกเลิก' }].map(f => (
                <button key={f.v}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-none cursor-pointer"
                  style={{ background: filterStatus === f.v ? '#14b8a6' : '#f1f5f9', color: filterStatus === f.v ? 'white' : '#334155', fontFamily: 'Sarabun,sans-serif' }}
                  onClick={() => setFilterStatus(f.v)}>{f.l}</button>
              ))}
            </div>
            <select className="form-control" style={{ maxWidth: 220, fontFamily: 'Sarabun,sans-serif' }}
              value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">ทุกห้อง</option>
              {rooms.map(r => <option key={r.id} value={r.name}>{r.icon} {r.name}</option>)}
            </select>
            <input type="date" className="form-control" style={{ maxWidth: 160 }}
              value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            {hasFilter && (
              <button className="px-3 py-1.5 rounded-lg text-xs border-none cursor-pointer"
                style={{ background: '#f1f5f9', color: '#64748b', fontFamily: 'Sarabun,sans-serif' }}
                onClick={() => { setFilterStatus(''); setFilterRoom(''); setFilterDate(''); setSearch(''); }}>
                ล้างทั้งหมด ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">รายการจองทั้งหมด</div>
          <span className="badge badge-info" style={{ fontFamily: 'Sarabun,sans-serif' }}>{filtered.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <div className="text-sm" style={{ fontFamily: 'Sarabun,sans-serif' }}>ไม่พบรายการ</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['#', 'ผู้จอง', 'ห้อง', 'วันที่', 'เวลา', 'สถานะ', 'จัดการ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 border-b"
                      style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const room = rooms.find(r => r.name === b.room);
                  return (
                    <tr key={b.id}
                      style={{ borderLeft: `3px solid ${b.status === 'confirmed' ? '#22c55e' : '#ef4444'}` }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Sarabun,sans-serif' }}>{b.name}</div>
                        <div className="text-xs text-gray-400" style={{ fontFamily: 'Sarabun,sans-serif' }}>{b.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ fontFamily: 'Sarabun,sans-serif', minWidth: 150 }}>{room?.icon} {b.room}</td>
                      <td className="px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: '#0d9488', fontFamily: 'Sarabun,sans-serif' }}>{formatDateTH(b.date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: '#0d9488' }}>{b.startTime}–{b.endTime}</td>
                      <td className="px-4 py-3"><StatusDot status={b.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {/* View */}
                          <button title="ดูรายละเอียด" onClick={() => setViewBooking(b)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>👁️</button>
                          {/* Edit */}
                          <button title="แก้ไข" onClick={() => setEditBooking(b)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #dbeafe', background: '#eff6ff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>✏️</button>
                          {/* Cancel — only for confirmed */}
                          {b.status === 'confirmed' && (
                            <button title="ยกเลิก" onClick={() => setCancelTarget(b)}
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #fef3c7', background: '#fffbeb', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}>🚫</button>
                          )}
                          {/* Delete */}
                          <button title="ลบถาวร" onClick={() => setDeleteTarget(b)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: จัดการห้องประชุม ─────────────────────────────────────────────────────
const ROOM_ICONS = ['🏢', '💎', '🏛️', '⚔️', '💻', '🏟️', '🎯', '📋', '🔬', '🎨', '🌟', '🏆'];

function RoomFormModal({ initial, onSave, onClose, showToast }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial || { name: '', capacity: '', icon: '🏢', floor: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/rooms/${initial.id}`, form);
        showToast('✅ แก้ไขห้องประชุมสำเร็จ', 'success');
      } else {
        await api.post('/rooms', form);
        showToast('✅ เพิ่มห้องประชุมสำเร็จ', 'success');
      }
      onSave();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ background: isEdit ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#0d9488,#14b8a6)', borderRadius: '16px 16px 0 0', padding: '20px 24px' }}>
          <div className="flex items-center justify-between">
            <div style={{ color: 'white', fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 16 }}>
              {isEdit ? '✏️ แก้ไขห้องประชุม' : '➕ เพิ่มห้องประชุมใหม่'}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>✕</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ชื่อห้อง</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="เช่น ห้องประชุมชั้น 2" required style={{ fontFamily: 'Sarabun,sans-serif' }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ความจุ (ที่นั่ง)</label>
              <input type="number" min="1" className="form-control" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="20" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ชั้น</label>
              <input className="form-control" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="1" required style={{ fontFamily: 'Sarabun,sans-serif' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif' }}>ไอคอน</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ROOM_ICONS.map(ic => (
                <button type="button" key={ic} onClick={() => set('icon', ic)}
                  style={{ width: 40, height: 40, borderRadius: 10, border: form.icon === ic ? '2.5px solid #14b8a6' : '1.5px solid #e2e8f0', background: form.icon === ic ? '#f0fdf4' : 'white', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun,sans-serif' }} onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}
              style={{ fontFamily: 'Sarabun,sans-serif', background: isEdit ? '#2563eb' : '#0d9488' }}>
              {saving ? 'กำลังบันทึก...' : (isEdit ? '💾 บันทึก' : '➕ เพิ่มห้อง')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabRooms({ rooms, onRefreshRooms, showToast }) {
  const [editRoom, setEditRoom] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteRoom, setDeleteRoom] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteRoom) return;
    setDeleting(true);
    try {
      await api.delete(`/rooms/${deleteRoom.id}`);
      showToast('🗑️ ลบห้องประชุมสำเร็จ', 'success');
      setDeleteRoom(null);
      onRefreshRooms();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div className="animate-fade-in">
      {/* Modals */}
      {showAdd && <RoomFormModal onSave={() => { setShowAdd(false); onRefreshRooms(); }} onClose={() => setShowAdd(false)} showToast={showToast} />}
      {editRoom && <RoomFormModal initial={editRoom} onSave={() => { setEditRoom(null); onRefreshRooms(); }} onClose={() => setEditRoom(null)} showToast={showToast} />}
      {deleteRoom && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🗑️</div>
            <div style={{ fontFamily: 'Prompt,sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b', marginBottom: 8 }}>ลบห้องนี้?</div>
            <div style={{ fontFamily: 'Sarabun,sans-serif', fontSize: 13, color: '#64748b', marginBottom: 6 }}><strong>{deleteRoom.icon} {deleteRoom.name}</strong></div>
            <div style={{ fontFamily: 'Sarabun,sans-serif', fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>การจองที่ผูกกับห้องนี้จะยังคงอยู่ในระบบ</div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteRoom(null)} className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun,sans-serif' }} disabled={deleting}>ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'Sarabun,sans-serif' }}>
                {deleting ? 'กำลังลบ...' : '🗑️ ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt,sans-serif' }}>🏢 จัดการห้องประชุม</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun,sans-serif' }}>เพิ่ม แก้ไข ลบห้องประชุม · {rooms.length} ห้อง</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ fontFamily: 'Sarabun,sans-serif' }}>➕ เพิ่มห้องใหม่</button>
      </div>

      {/* Room grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rooms.map(room => (
          <div key={room.id} className="card" style={{ border: '1.5px solid #e2e8f0', borderTop: `4px solid #14b8a6` }}>
            <div style={{ padding: '16px 20px' }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#f0fdf4,#ccfbf1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                  {room.icon}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button title="แก้ไข" onClick={() => setEditRoom(room)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #dbeafe', background: '#eff6ff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>✏️</button>
                  <button title="ลบ" onClick={() => setDeleteRoom(room)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>🗑️</button>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: 'Sarabun,sans-serif', fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>{room.name}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#dbeafe', color: '#2563eb', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>
                    👥 {room.capacity} ที่นั่ง
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#475569', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>
                    ชั้น {room.floor}
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f8fafc', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {room.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add placeholder */}
        <div onClick={() => setShowAdd(true)} className="card"
          style={{ border: '2px dashed #cbd5e1', cursor: 'pointer', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#14b8a6'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>➕</div>
          <div style={{ fontSize: 13, color: '#64748b', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>เพิ่มห้องใหม่</div>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'Sarabun,sans-serif' }}>
        ⚠️ การเปลี่ยนแปลงห้องถูกเก็บใน memory — จะรีเซ็ตเมื่อรีสตาร์ทเซิร์ฟเวอร์ หากต้องการถาวรให้แก้ไขใน <code>server-sheets/routes/rooms.js</code>
      </div>
    </div>
  );
}

// ─── Tab: สถิติ (moved from Dashboard) ────────────────────────────────────────
const TIME_SLOTS_ADMIN = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

function TabAnalytics({ rooms, bookings, loading }) {
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  const roomUsage = useMemo(() =>
    rooms.map(r => {
      const count = confirmed.filter(b => b.room === r.name).length;
      const pct = confirmed.length > 0 ? Math.round((count / confirmed.length) * 100) : 0;
      return { ...r, count, pct };
    }).sort((a, b) => b.count - a.count),
    [rooms, confirmed]);

  const maxUsage = Math.max(...roomUsage.map(r => r.count), 1);

  const peakHours = useMemo(() => {
    const slots = {};
    TIME_SLOTS_ADMIN.forEach(t => { slots[t] = 0; });
    confirmed.forEach(b => {
      TIME_SLOTS_ADMIN.forEach(t => {
        if (t >= b.startTime && t < b.endTime) slots[t] = (slots[t] || 0) + 1;
      });
    });
    return Object.entries(slots).map(([time, count]) => ({ time, count }));
  }, [confirmed]);

  const maxPeak = Math.max(...peakHours.map(p => p.count), 1);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = confirmed.filter(b => b.date === todayStr).length;
  const rate = bookings.length > 0 ? Math.round((confirmed.length / bookings.length) * 100) : 0;

  // top booker
  const bookerMap = {};
  confirmed.forEach(b => { bookerMap[b.name] = (bookerMap[b.name] || 0) + 1; });
  const topBookers = Object.entries(bookerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="loader border-teal-500 border-t-white mx-auto" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  const heatColor = (count) => {
    if (count === 0) return '#f8fafc';
    if (count <= 1) return '#ccfbf1';
    if (count <= 3) return '#5eead4';
    if (count <= 6) return '#14b8a6';
    return '#0f766e';
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt,sans-serif' }}>📊 สถิติการใช้งาน</h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun,sans-serif' }}>วิเคราะห์การจองห้องประชุมทั้งหมด</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          { icon: '📋', label: 'ทั้งหมด', value: bookings.length, dot: '#3b82f6', bg: '#dbeafe' },
          { icon: '✅', label: 'ยืนยันแล้ว', value: confirmed.length, dot: '#22c55e', bg: '#dcf5e7' },
          { icon: '❌', label: 'ยกเลิก', value: cancelled.length, dot: '#ef4444', bg: '#fee2e2' },
          { icon: '📅', label: 'จองวันนี้', value: todayCount, dot: '#f59e0b', bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background: s.bg, border: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{s.icon}</div>
            <div>
              <div className="font-bold text-[26px] text-gray-800" style={{ fontFamily: 'Prompt,sans-serif', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontFamily: 'Sarabun,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success rate bar */}
      <div className="card mb-5">
        <div style={{ padding: '14px 20px' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, fontFamily: 'Sarabun,sans-serif', color: '#64748b', fontWeight: 600 }}>อัตราการจองสำเร็จ</span>
            <span style={{ fontSize: 13, fontFamily: 'Prompt,sans-serif', fontWeight: 700, color: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444' }}>{rate}%</span>
          </div>
          <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${rate}%`, borderRadius: 99, background: rate >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : rate >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)', transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Room usage heatmap-style bars */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏢 การใช้งานห้องประชุม</div></div>
          <div className="card-body">
            {roomUsage.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm" style={{ fontFamily: 'Sarabun,sans-serif' }}>ยังไม่มีข้อมูล</div>
            ) : (
              <div className="flex flex-col gap-4">
                {roomUsage.map(r => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 truncate mr-2" style={{ fontFamily: 'Sarabun,sans-serif' }}>{r.icon} {r.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: r.count > 0 ? '#ccfbf1' : '#f1f5f9', color: r.count > 0 ? '#0f766e' : '#94a3b8', fontFamily: 'Sarabun,sans-serif', fontWeight: 600 }}>{r.pct}%</span>
                        <span className="text-sm font-bold" style={{ color: '#0d9488' }}>{r.count} ครั้ง</span>
                      </div>
                    </div>
                    <div style={{ height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${maxUsage > 0 ? (r.count / maxUsage) * 100 : 0}%`, borderRadius: 99, background: `linear-gradient(90deg,${heatColor(r.count)},${heatColor(r.count + 2)})`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Peak hours bar chart */}
        <div className="card">
          <div className="card-header"><div className="card-title">⏰ ช่วงเวลายอดนิยม</div></div>
          <div className="card-body">
            {confirmed.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm" style={{ fontFamily: 'Sarabun,sans-serif' }}>ยังไม่มีข้อมูล</div>
            ) : (
              <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ height: 140 }}>
                {peakHours.filter((_, i) => i % 2 === 0).map(p => (
                  <div key={p.time} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 26 }}>
                    <div style={{
                      width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease',
                      height: `${maxPeak > 0 ? Math.max((p.count / maxPeak) * 100, p.count > 0 ? 6 : 0) : 0}px`,
                      background: p.count > 0 ? `linear-gradient(180deg,${heatColor(p.count + 2)},${heatColor(p.count)})` : '#f1f5f9',
                    }} />
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, transform: 'rotate(-45deg)', transformOrigin: 'top left', translateY: '8px', fontFamily: 'Sarabun,sans-serif' }}>{p.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top bookers */}
      {topBookers.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">🏅 ผู้จองสูงสุด (Top 5)</div></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['อันดับ', 'ชื่อ', 'จำนวนครั้ง', 'สัดส่วน'].map(h => (
                    <th key={h} className="text-left px-4 py-3 border-b"
                      style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun,sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBookers.map(([name, count], i) => {
                  const pct = confirmed.length > 0 ? Math.round((count / confirmed.length) * 100) : 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <tr key={name} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="px-4 py-3 text-lg">{medals[i] || `#${i + 1}`}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800" style={{ fontFamily: 'Sarabun,sans-serif' }}>{name}</td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: '#0d9488' }}>{count} ครั้ง</td>
                      <td className="px-4 py-3" style={{ minWidth: 140 }}>
                        <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg,#2dd4bf,#0d9488)' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontFamily: 'Sarabun,sans-serif' }}>{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: การตั้งค่า ───────────────────────────────────────────────────────────
function TabSettings({ rooms }) {
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [lineEnabled, setLineEnabled] = useState(false);

  const endpoints = [
    { method: 'GET', path: '/api/bookings', desc: 'ดึงรายการจองทั้งหมด' },
    { method: 'POST', path: '/api/bookings', desc: 'สร้างการจองใหม่' },
    { method: 'PATCH', path: '/api/bookings/:id/cancel', desc: 'ยกเลิกการจอง' },
    { method: 'GET', path: '/api/rooms', desc: 'ดึงรายชื่อห้อง' },
    { method: 'GET', path: '/api/rooms/:id/availability?date=', desc: 'ดูช่วงเวลาว่าง' },
    { method: 'POST', path: '/api/auth/login', desc: 'เข้าสู่ระบบ Admin' },
    { method: 'GET', path: '/api/health', desc: 'ตรวจสอบสถานะระบบ' },
  ];
  const methodColor = m => ({ GET: '#2563eb', POST: '#16a34a', PATCH: '#d97706', DELETE: '#dc2626' }[m] || '#334155');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>⚙️ การตั้งค่า</h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>ตั้งค่าการเชื่อมต่อและข้อมูลระบบ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrations */}
        <div className="card">
          <div className="card-header"><div className="card-title">🔗 การเชื่อมต่อ</div></div>
          <div className="card-body flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: '#dbeafe' }}>📅</div>
                <div>
                  <div className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Sarabun, sans-serif' }}>Google Calendar</div>
                  <div className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>สร้างนัดหมายอัตโนมัติเมื่อจองสำเร็จ</div>
                </div>
              </div>
              <Toggle enabled={calendarEnabled} onChange={setCalendarEnabled} />
            </div>
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: '#dcfce7' }}>💬</div>
                <div>
                  <div className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Sarabun, sans-serif' }}>LINE Notify</div>
                  <div className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>แจ้งเตือนผ่าน LINE เมื่อมีการจอง/ยกเลิก</div>
                </div>
              </div>
              <Toggle enabled={lineEnabled} onChange={setLineEnabled} />
            </div>
            <div className="p-3 rounded-xl text-xs" style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'Sarabun, sans-serif' }}>
              ⚠️ ต้องตั้งค่า credentials ใน <code>.env</code> ก่อนเปิดใช้งาน
            </div>
          </div>
        </div>

        {/* Rooms list */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏢 รายชื่อห้องประชุม</div></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['ID', 'ห้อง', 'ที่นั่ง', 'ชั้น'].map(h => (
                    <th key={h} className="text-left px-4 py-3 border-b"
                      style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = '#f0faf4'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="px-4 py-3 text-xs font-mono text-teal-600">{r.id}</td>
                    <td className="px-4 py-3 text-sm" style={{ fontFamily: 'Sarabun, sans-serif' }}>{r.icon} {r.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.capacity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.floor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Reference */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="card-title">📡 API Reference</div>
            <span className="badge badge-info" style={{ fontFamily: 'Sarabun, sans-serif' }}>Backend: localhost:5001</span>
          </div>
          <div className="card-body flex flex-col gap-2">
            {endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="text-xs font-bold px-2 py-1 rounded-md text-white flex-shrink-0"
                  style={{ background: methodColor(ep.method), minWidth: 52, textAlign: 'center' }}>{ep.method}</span>
                <code className="text-xs text-gray-700 flex-1 truncate" style={{ fontFamily: 'monospace' }}>{ep.path}</code>
                <span className="text-xs text-gray-500 hidden sm:block" style={{ fontFamily: 'Sarabun, sans-serif' }}>{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data model */}
        <div className="card lg:col-span-2">
          <div className="card-header"><div className="card-title">🗃️ Data Model (Google Sheets)</div></div>
          <div className="card-body">
            <pre className="text-xs rounded-xl p-4 overflow-x-auto" style={{ background: '#1e293b', color: '#e2e8f0', fontFamily: 'monospace', lineHeight: 1.6 }}>
              {`Sheet: Booking-List3
Columns: id | name | phone | room | date | startTime | endTime | purpose | status | createdAt

{
  "id":        "bk_xxxxx_xxxx",
  "name":      "ชื่อผู้จอง",
  "phone":     "0812345678",
  "room":      "ห้องมณีจันทรา ชั้น 1",
  "date":      "2026-03-25",
  "startTime": "09:00",
  "endTime":   "11:00",
  "purpose":   "ประชุมทีม",
  "status":    "confirmed | cancelled",
  "createdAt": "2026-03-25T09:00:00.000Z"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: จัดการผู้ใช้ ─────────────────────────────────────────────────────────
function TabUsers() {
  const [users, setUsers] = useState([
    { id: 'u1', username: 'admin', name: 'ผู้ดูแลระบบ', role: 'admin', createdAt: '2026-01-01' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.name || !form.password) { setError('กรุณากรอกข้อมูลให้ครบ'); return; }
    if (users.find(u => u.username === form.username)) { setError('ชื่อผู้ใช้นี้มีอยู่แล้ว'); return; }
    setUsers(prev => [...prev, {
      id: `u${Date.now()}`, username: form.username, name: form.name,
      role: form.role, createdAt: new Date().toISOString().split('T')[0]
    }]);
    setForm({ username: '', name: '', password: '', role: 'viewer' });
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    if (id === 'u1') { alert('ไม่สามารถลบ Admin หลักได้'); return; }
    if (!window.confirm('ยืนยันการลบผู้ใช้นี้?')) return;
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-bold text-[20px] text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>👥 จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-500 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>เพิ่ม / ลบ ผู้ใช้งานระบบ Admin</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ fontFamily: 'Sarabun, sans-serif' }}>+ เพิ่มผู้ใช้</button>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#f1f5f9' }}>
              <h3 className="font-bold text-lg text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>เพิ่มผู้ใช้ใหม่</h3>
              <button onClick={() => { setShowAdd(false); setError(''); }} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 flex flex-col gap-4">
              {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm" style={{ fontFamily: 'Sarabun, sans-serif' }}>❌ {error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ชื่อผู้ใช้ (Username)</label>
                <input className="form-control" placeholder="username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ชื่อแสดง</label>
                <input className="form-control" placeholder="ชื่อ-นามสกุล" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">รหัสผ่าน</label>
                <input type="password" className="form-control" placeholder="••••••••" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">สิทธิ์</label>
                <select className="form-control" style={{ fontFamily: 'Sarabun, sans-serif' }} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="admin">admin — จัดการทุกอย่าง</option>
                  <option value="viewer">viewer — ดูอย่างเดียว</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" style={{ fontFamily: 'Sarabun, sans-serif' }} onClick={() => { setShowAdd(false); setError(''); }}>ยกเลิก</button>
                <button type="submit" className="btn-primary flex-1" style={{ fontFamily: 'Sarabun, sans-serif' }}>บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">รายชื่อผู้ใช้</div>
          <span className="badge badge-info" style={{ fontFamily: 'Sarabun, sans-serif' }}>{users.length} คน</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['#', 'ชื่อแสดง', 'Username', 'สิทธิ์', 'วันที่เพิ่ม', 'จัดการ'].map(h => (
                  <th key={h} className="text-left px-4 py-3 border-b"
                    style={{ background: '#f8fafc', color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Sarabun, sans-serif', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} onMouseEnter={e => e.currentTarget.style.background = '#f0faf4'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'Sarabun, sans-serif' }}>{u.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-teal-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.role === 'admin' ? 'badge-success' : 'badge-info'}`} style={{ fontFamily: 'Sarabun, sans-serif' }}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500" style={{ fontFamily: 'Sarabun, sans-serif' }}>{u.createdAt}</td>
                  <td className="px-4 py-3">
                    {u.id !== 'u1' && (
                      <button className="btn-danger btn-sm" style={{ fontFamily: 'Sarabun, sans-serif' }} onClick={() => handleDelete(u.id)}>ลบ</button>
                    )}
                    {u.id === 'u1' && <span className="text-xs text-gray-300" style={{ fontFamily: 'Sarabun, sans-serif' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: '#fef3c7', color: '#92400e', fontFamily: 'Sarabun, sans-serif' }}>
        ⚠️ ขณะนี้รายชื่อผู้ใช้ถูกเก็บในหน่วยความจำชั่วคราว ในอนาคตจะเชื่อมต่อกับฐานข้อมูลจริง
      </div>
    </div>
  );
}

// ─── Main Admin Shell ──────────────────────────────────────────────────────────
export default function AdminSheets() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('admin_token'));
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([api.get('/bookings'), api.get('/rooms')]);
      setBookings(bRes.data.bookings || []);
      setRooms(rRes.data.rooms || []);
    } catch { showToast('ไม่สามารถโหลดข้อมูลได้', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (authed) fetchData(); }, [authed]);
  useEffect(() => {
    if (!authed) return;
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      const user = res.data.user;
      const token = res.data.token;
      if (token && user?.role === 'admin') {
        sessionStorage.setItem('admin_token', token);
        setAuthed(true);
      } else { setLoginError('ไม่มีสิทธิ์เข้าถึงหน้านี้'); }
    } catch (err) { setLoginError(err.response?.data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAuthed(false);
    setBookings([]);
  };

  // ─── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #f0faf4 0%, #f0fdf9 50%, #ffffff 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center p-1.5"
              style={{ background: 'white', boxShadow: '0 4px 15px rgba(20,184,166,0.3)', border: '2px solid #14b8a6' }}>
              <img src={logo} alt="โลโก้เทศบาลตำบลบ้านคลอง" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 className="font-bold text-2xl text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>ผู้ดูแลระบบ</h1>
            <p className="text-gray-400 text-sm mt-1" style={{ fontFamily: 'Sarabun, sans-serif' }}>เทศบาลตำบลบ้านคลอง · ระบบจัดการห้องประชุม</p>
          </div>
          <div className="card">
            <div className="card-body">
              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm" style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  ❌ {loginError}
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Username</label>
                  <input type="text" className="form-control" placeholder="admin@meeting.com" required
                    value={loginForm.login} onChange={e => setLoginForm(p => ({ ...p, login: e.target.value }))} />
                </div>
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                  <input type="password" className="form-control" placeholder="••••••••" required
                    value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="mb-6 p-3 rounded-lg text-xs" style={{ background: '#f0fdf4', color: '#16a34a', fontFamily: 'Sarabun, sans-serif' }}>
                  💡 admin@meeting.com / admin123
                </div>
                <button type="submit" className="btn-primary btn-lg w-full" disabled={loginLoading}>
                  {loginLoading ? <><span className="loader" />&nbsp;กำลังเข้าสู่ระบบ...</> : '🔐 เข้าสู่ระบบ'}
                </button>
              </form>
              <button onClick={() => navigate('/dashboard')}
                className="mt-4 w-full text-center text-sm text-teal-500 cursor-pointer bg-transparent border-none"
                style={{ fontFamily: 'Sarabun, sans-serif' }}>
                ← กลับหน้าจองห้องประชุม
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Admin Shell ────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'bookings', icon: '�', label: 'จัดการจอง' },
    { id: 'rooms', icon: '🏢', label: 'จัดการห้อง' },
    { id: 'analytics', icon: '📊', label: 'สถิติ' },
    { id: 'users', icon: '👥', label: 'จัดการผู้ใช้' },
    { id: 'settings', icon: '⚙️', label: 'การตั้งค่า' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0faf4 0%, #f0fdf9 50%, #ffffff 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 text-white" style={{
        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
        boxShadow: '0 4px 20px rgba(13,148,136,0.4)'
      }}>
        <div className="max-w-[1400px] mx-auto px-6 py-0">
          <div className="flex items-center justify-between" style={{ height: 72 }}>
            {/* Logo */}
            <button onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer bg-transparent border-none text-white flex-shrink-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center p-1 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <img src={logo} alt="โลโก้เทศบาลตำบลบ้านคลอง" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-[18px] leading-tight" style={{ fontFamily: 'Prompt, sans-serif' }}>ทต.บ้านคลอง · Admin</div>
                <div className="text-[12px] opacity-85" style={{ fontFamily: 'Sarabun, sans-serif' }}>แดชบอร์ดผู้ดูแลระบบ</div>
              </div>
            </button>

            {/* Nav tabs */}
            <nav className="hidden md:flex items-center gap-1 mx-4">
              {tabs.map(tab => (
                <button key={tab.id}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all border-none cursor-pointer text-white"
                  style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'transparent', fontFamily: 'Sarabun, sans-serif' }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent'; }}
                  onClick={() => setActiveTab(tab.id)}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border-none text-white"
                style={{ background: 'rgba(255,255,255,0.15)', fontFamily: 'Sarabun, sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                📅 จองห้อง
              </button>
              <button onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border-none text-white"
                style={{ background: 'rgba(255,255,255,0.15)', fontFamily: 'Sarabun, sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}>
                ออกจากระบบ
              </button>
            </div>
          </div>

          {/* Mobile tab bar */}
          <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id}
                className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap transition-all border-none cursor-pointer text-white flex-shrink-0"
                style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'transparent', fontFamily: 'Sarabun, sans-serif' }}
                onClick={() => setActiveTab(tab.id)}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {activeTab === 'bookings' && <TabBookings bookings={bookings} rooms={rooms} loading={loading} onRefresh={fetchData} showToast={showToast} />}
        {activeTab === 'rooms' && <TabRooms rooms={rooms} onRefreshRooms={fetchData} showToast={showToast} />}
        {activeTab === 'analytics' && <TabAnalytics rooms={rooms} bookings={bookings} loading={loading} />}
        {activeTab === 'users' && <TabUsers />}
        {activeTab === 'settings' && <TabSettings rooms={rooms} />}
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[300]">
          <div className={`toast toast-${toast.type}`} style={{ fontFamily: 'Sarabun, sans-serif' }}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
