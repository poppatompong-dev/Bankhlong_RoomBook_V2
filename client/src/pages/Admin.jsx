import { useState, useEffect, useMemo } from 'react';
import { bookingsAPI, roomsAPI, usersAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { formatDateTH, getStatusBadge } from '../utils/helpers';
import logo from '../assets/logo.png';

// --- Modals ---

function ConfirmModal({ options, onClose }) {
  if (!options) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        <div className={`p-4 flex justify-between items-center text-white ${options.isDanger ? 'bg-red-500' : 'bg-teal-600'}`}>
          <h2 className="font-prompt text-base font-bold">{options.title}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl border-none bg-transparent cursor-pointer">&times;</button>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-sm whitespace-pre-line text-center mb-6" style={{fontFamily: 'Sarabun'}}>{options.message}</p>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary flex-1" onClick={onClose}>ยกเลิก</button>
            <button className={`flex-1 font-semibold py-2 px-4 rounded-lg text-white border-none cursor-pointer transition-colors ${options.isDanger ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`} 
              onClick={() => { options.onConfirm(); onClose(); }}>
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewBookingModal({ booking, onClose }) {
  const userName = booking.name || booking.userId?.name || 'ไม่ระบุ';
  const roomName = booking.room || booking.roomId?.name || booking.roomId;
  const roomIcon = booking.roomIcon || '🏢';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-5 flex justify-between items-center text-white">
          <h2 className="font-prompt text-lg font-bold">📋 รายละเอียดการจอง</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh] text-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><span className="text-gray-500 font-semibold block mb-1">ชื่อผู้จอง</span>{userName}</div>
            <div><span className="text-gray-500 font-semibold block mb-1">เบอร์โทร</span>{booking.phone || '-'}</div>
            <div><span className="text-gray-500 font-semibold block mb-1">หน่วยงาน</span>{booking.dept || '-'}</div>
            <div><span className="text-gray-500 font-semibold block mb-1">ห้องประชุม</span>{roomIcon} {roomName}</div>
            <div><span className="text-gray-500 font-semibold block mb-1">วันที่</span>{formatDateTH(booking.date)}</div>
            <div><span className="text-gray-500 font-semibold block mb-1">เวลา</span>{booking.startTime} - {booking.endTime} น.</div>
            <div className="col-span-2"><span className="text-gray-500 font-semibold block mb-1">วัตถุประสงค์</span>{booking.purpose}</div>
            <div className="col-span-2"><span className="text-gray-500 font-semibold block mb-1">รูปแบบการจัดห้อง</span>{booking.roomLayout || '-'}</div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold text-teal-600 mb-2">บริการ/อุปกรณ์</h3>
            <ul className="list-disc pl-5 text-gray-700 text-sm" style={{fontFamily:'Sarabun'}}>
              {booking.equipment?.projector && <li>โปรเจคเตอร์</li>}
              {booking.equipment?.sound && <li>เครื่องเสียง</li>}
              {booking.equipment?.tv && <li>จอทีวี/จอภาพ</li>}
              {booking.equipment?.laptop && <li>โน้ตบุ๊ก</li>}
              {booking.equipment?.whiteboard && <li>ไวท์บอร์ด</li>}
              {booking.equipment?.videoConference && <li>วิดีโอคอนเฟอร์เซนส์</li>}
              {booking.equipment?.micCount > 0 && <li>ไมค์ ({booking.equipment.micType}): {booking.equipment.micCount} ตัว</li>}
              {booking.equipment?.other && <li>อื่นๆ: {booking.equipment.other}</li>}
              {booking.additionalServices?.water && <li>น้ำดื่ม</li>}
              {booking.additionalServices?.coffee && <li>กาแฟ/ของว่าง</li>}
              {booking.additionalServices?.nameCards && <li>ป้ายชื่อ</li>}
              {booking.additionalServices?.signage && <li>ป้ายไวนิล</li>}
              {!booking.equipment && !booking.additionalServices && <li className="text-gray-400">ไม่มีการขอใช้อุปกรณ์เพิ่มเติม</li>}
            </ul>
          </div>
        </div>
        <div className="p-4 bg-gray-50 text-right">
          <button onClick={onClose} className="btn-secondary">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  );
}

function RoomModal({ room, onSave, onClose, showToast }) {
  const isEdit = !!room;
  const [form, setForm] = useState(room || { name: '', capacity: '', floor: '', icon: '🏢' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await roomsAPI.update(room._id, form);
        showToast('แก้ไขห้องประชุมสำเร็จ', 'success');
      } else {
        await roomsAPI.create(form);
        showToast('เพิ่มห้องประชุมสำเร็จ', 'success');
      }
      onSave();
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        <div className={`p-5 flex justify-between items-center text-white ${isEdit ? 'bg-blue-600' : 'bg-teal-600'}`}>
          <h2 className="font-prompt text-lg font-bold">{isEdit ? '✏️ แก้ไขห้องประชุม' : '➕ เพิ่มห้องประชุมใหม่'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ชื่อห้อง</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ความจุ (คน)</label>
              <input type="number" className="form-control" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ชั้น</label>
              <input className="form-control" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} required />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ไอคอน</label>
            <div className="flex flex-wrap gap-2">
              {['🏢', '💎', '🏛️', '⚔️', '💻', '🏟️', '⚡', '📊'].map(ic => (
                <button type="button" key={ic} onClick={() => setForm({ ...form, icon: ic })}
                  className={`w-10 h-10 rounded-lg text-xl border-2 flex items-center justify-center ${form.icon === ic ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ user, onSave, onClose, showToast }) {
  const isEdit = !!user;
  const [form, setForm] = useState(user ? { name: user.name || '', username: user.username || '', phone: user.phone || '', password: '', role: user.role || 'user' } : { name: '', username: '', phone: '', password: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form };
      if (isEdit && !data.password) delete data.password;

      if (isEdit) {
        await usersAPI.update(user._id, data);
        showToast('แก้ไขผู้ใช้สำเร็จ', 'success');
      } else {
        await usersAPI.create(data);
        showToast('เพิ่มผู้ใช้สำเร็จ', 'success');
      }
      onSave();
    } catch {
      showToast('เกิดข้อผิดพลาดในการบันทึก (ชื่อบัญชีอาจซ้ำ)', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
        <div className={`p-5 flex justify-between items-center text-white ${isEdit ? 'bg-blue-600' : 'bg-green-600'}`}>
          <h2 className="font-prompt text-lg font-bold">{isEdit ? '✏️ แก้ไขผู้ใช้' : '➕ เพิ่มผู้ใช้ใหม่'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ชื่อ-นามสกุล</label>
            <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ชื่อบัญชีผู้ใช้ (username)</label>
            <input type="text" className="form-control" placeholder="ภาษาอังกฤษ, ตัวเล็ก, ไม่มีช่องว่าง" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required autoComplete="username" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">เบอร์โทร</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">สิทธิ์การใช้งาน</label>
              <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="user">ผู้ใช้ทั่วไป</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">รหัสผ่าน {isEdit ? '(เว้นว่างถ้าไม่เปลี่ยน)' : ''}</label>
            <input type="password" className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!isEdit} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">ยกเลิก</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 bg-green-600 border-none">{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Main Admin Component ---

export default function Admin() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { socket } = useSocket();

  // Dialog targets
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [viewBooking, setViewBooking] = useState(null);
  const [editRoom, setEditRoom] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  // Booking search/filter
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, rRes, uRes] = await Promise.all([
        bookingsAPI.list({ limit: 500 }),
        roomsAPI.list(),
        usersAPI.list()
      ]);
      setBookings(bRes.data.bookings || []);
      setRooms(rRes.data.rooms || []);
      setUsers(uRes.data.users || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => fetchData();
    socket.on('booking:created', handler);
    socket.on('booking:updated', handler);
    socket.on('booking:cancelled', handler);
    return () => {
      socket.off('booking:created', handler);
      socket.off('booking:updated', handler);
      socket.off('booking:cancelled', handler);
    };
  }, [socket]);

  // Handlers
  const handleCancelBooking = (id) => {
    setConfirmDialog({
      title: '⚠️ ยืนยันการยกเลิก',
      message: 'คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?',
      isDanger: true,
      onConfirm: async () => {
        try {
          await bookingsAPI.update(id, { status: 'cancelled' });
          showToast('ยกเลิกการจองสำเร็จ', 'success');
          fetchData();
        } catch {
          showToast('ดำเนินการไม่สำเร็จ', 'error');
        }
      }
    });
  };

  const handleApproveBooking = async (id) => {
    try {
      await bookingsAPI.update(id, { status: 'approved' });
      showToast('✅ อนุมัติการจองสำเร็จ', 'success');
      fetchData();
    } catch {
      showToast('ดำเนินการไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteBooking = (b) => {
    setConfirmDialog({
      title: '🗑️ ลบการจองถาวร',
      message: `ลบการจองของ "${b.name || b.userId?.name || 'ไม่ระบุ'}"\nวันที่ ${b.date} เวลา ${b.startTime}–${b.endTime}\n\nข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await bookingsAPI.cancel(b._id); // DELETE /api/bookings/:id
          showToast('ลบการจองสำเร็จ', 'success');
          fetchData();
        } catch {
          showToast('ไม่สามารถลบได้', 'error');
        }
      }
    });
  };

  const handleDeleteRoom = (id) => {
    setConfirmDialog({
      title: '⚠️ ยืนยันการลบ',
      message: 'คุณต้องการลบห้องประชุมนี้ใช่หรือไม่?\nข้อมูลอาจไม่สามารถกู้คืนได้',
      isDanger: true,
      onConfirm: async () => {
        try {
          await roomsAPI.delete(id);
          showToast('ลบสำเร็จ', 'success');
          fetchData();
        } catch {
          showToast('ไม่สามารถลบได้ (อาจมีข้อมูลอ้างอิง)', 'error');
        }
      }
    });
  };

  const handleDeleteUser = (id) => {
    setConfirmDialog({
      title: '⚠️ ยืนยันการลบผู้ใช้งาน',
      message: 'คุณต้องการลบบัญชีผู้ใช้งานนี้ใช่หรือไม่?',
      isDanger: true,
      onConfirm: async () => {
        try {
          await usersAPI.delete(id);
          showToast('ลบสำเร็จ', 'success');
          fetchData();
        } catch {
          showToast('ไม่สามารถลบได้', 'error');
        }
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="loader border-teal-500 border-t-white" style={{width: 32, height: 32, borderWidth: 3}}></div>
    </div>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in font-sarabun">
      {/* Modals */}
      <ConfirmModal options={confirmDialog} onClose={() => setConfirmDialog(null)} />
      {viewBooking && <ViewBookingModal booking={viewBooking} rooms={rooms} onClose={() => setViewBooking(null)} />}
      {(showAddRoom || editRoom) && <RoomModal room={editRoom} showToast={showToast} onSave={() => { setShowAddRoom(false); setEditRoom(null); fetchData(); }} onClose={() => { setShowAddRoom(false); setEditRoom(null); }} />}
      {(showAddUser || editUser) && <UserModal user={editUser} showToast={showToast} onSave={() => { setShowAddUser(false); setEditUser(null); fetchData(); }} onClose={() => { setShowAddUser(false); setEditUser(null); }} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-prompt text-2xl font-bold text-gray-800">🛡️ จัดการระบบ (Admin)</h1>
          <p className="text-gray-500">จัดการข้อมูลหลักในระบบการจองห้องประชุม</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6 w-full md:w-auto self-start overflow-x-auto">
        {[
          { id: 'bookings', icon: '📋', label: 'การจองห้อง' },
          { id: 'rooms', icon: '🏢', label: 'ห้องประชุม' },
          { id: 'users', icon: '👥', label: 'ผู้ใช้งาน' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 md:flex-none px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border-none cursor-pointer ${activeTab === tab.id ? 'bg-teal-50 text-teal-700 shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
            <span className="mr-2 text-lg">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
        
        {activeTab === 'bookings' && (() => {
          const filtered = bookings.filter(b => {
            const q = bookingSearch.toLowerCase();
            if (!q) return true;
            return (b.name || b.userId?.name || '').toLowerCase().includes(q)
              || (b.room || '').toLowerCase().includes(q)
              || (b.dept || '').toLowerCase().includes(q)
              || (b.date || '').includes(q);
          }).filter(b => bookingStatusFilter === 'all' || b.status === bookingStatusFilter);

          return (
            <div>
              {/* Header + controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="font-prompt text-lg font-bold text-gray-800">รายการจองทั้งหมด <span className="text-sm font-normal text-gray-400">({filtered.length} รายการ)</span></h2>
                <button className="btn-secondary btn-sm" onClick={fetchData}>🔄 รีเฟรช</button>
              </div>
              {/* Search + Filter */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  className="form-control flex-1 min-w-[180px]"
                  placeholder="🔍 ค้นหาชื่อ, ห้อง, หน่วยงาน, วันที่..."
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                />
                <select className="form-control" style={{width:'auto'}} value={bookingStatusFilter} onChange={e => setBookingStatusFilter(e.target.value)}>
                  <option value="all">ทุกสถานะ</option>
                  <option value="approved">✅ อนุมัติแล้ว</option>
                  <option value="pending">⏳ รออนุมัติ</option>
                  <option value="cancelled">❌ ยกเลิก</option>
                </select>
              </div>
              {filtered.length === 0 ? <div className="text-center py-10 text-gray-400">ไม่มีรายการจอง</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="p-3 font-semibold rounded-tl-lg">ผู้จอง</th>
                        <th className="p-3 font-semibold">ห้องประชุม</th>
                        <th className="p-3 font-semibold">วัน/เวลา</th>
                        <th className="p-3 font-semibold">สถานะ</th>
                        <th className="p-3 font-semibold text-center rounded-tr-lg">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(b => {
                        const roomName = b.room || b.roomId?.name || 'ไม่ระบุ';
                        const roomIcon = b.roomIcon || '🏢';
                        const userName = b.name || b.userId?.name || 'ไม่ระบุ';
                        const st = getStatusBadge(b.status);
                        return (
                          <tr key={b._id} className="border-b border-gray-100 hover:bg-teal-50/30 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-sm text-gray-800">{userName}</div>
                              <div className="text-xs text-gray-400">{b.dept || '-'}</div>
                            </td>
                            <td className="p-3 text-sm">{roomIcon} {roomName}</td>
                            <td className="p-3">
                              <div className="text-xs font-semibold text-teal-600">{formatDateTH(b.date)}</div>
                              <div className="text-xs text-gray-500">{b.startTime} – {b.endTime}</div>
                            </td>
                            <td className="p-3"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* ดูรายละเอียด */}
                                <button onClick={() => setViewBooking(b)}
                                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-semibold">
                                  👁️
                                </button>
                                {/* อนุมัติ (เฉพาะ pending) */}
                                {b.status === 'pending' && (
                                  <button onClick={() => handleApproveBooking(b._id)}
                                    className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded font-semibold whitespace-nowrap">
                                    ✅ อนุมัติ
                                  </button>
                                )}
                                {/* ยกเลิก (active bookings เท่านั้น) */}
                                {b.status !== 'cancelled' && (
                                  <button onClick={() => handleCancelBooking(b._id)}
                                    className="px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded font-semibold whitespace-nowrap">
                                    ⛔ ยกเลิก
                                  </button>
                                )}
                                {/* ลบถาวร */}
                                <button onClick={() => handleDeleteBooking(b)}
                                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded font-semibold">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* Rooms */}
        {activeTab === 'rooms' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-prompt text-lg font-bold text-gray-800">ระบบจัดการห้องประชุม</h2>
              <button onClick={() => setShowAddRoom(true)} className="btn-primary btn-sm">➕ เพิ่มห้อง</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rooms.map(room => (
                <div key={room._id} className="border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-400"></div>
                  <div className="flex items-start justify-between">
                    <div className="bg-teal-50 w-12 h-12 flex items-center justify-center text-2xl rounded-xl">{room.icon}</div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditRoom(room)} className="text-blue-500 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100">✏️</button>
                      <button onClick={() => handleDeleteRoom(room._id)} className="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100">🗑️</button>
                    </div>
                  </div>
                  <h3 className="font-prompt font-bold text-gray-800 mt-4 text-base">{room.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">👥 {room.capacity} คน</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">🏢 ชั้น {room.floor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-prompt text-lg font-bold text-gray-800">จัดการผู้ใช้งานระบบ</h2>
              <button onClick={() => setShowAddUser(true)} className="btn-primary bg-green-600 border-none hover:bg-green-700 btn-sm">➕ เพิ่มผู้ใช้</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-3 font-semibold rounded-tl-lg">ชื่อ-นามสกุล</th>
                    <th className="p-3 font-semibold">ติดต่อ</th>
                    <th className="p-3 font-semibold">สิทธิ์</th>
                    <th className="p-3 font-semibold text-center rounded-tr-lg">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-sm text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-400 font-mono">@{u.username}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-mono text-gray-700">{u.username || '-'}</div>
                        <div className="text-xs text-gray-500">{u.phone || '-'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role === 'admin' ? '👑 ผู้ดูแล' : '👤 ทั่วไป'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditUser(u)} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded">✏️</button>
                          <button onClick={() => handleDeleteUser(u._id)} className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-gray-100 opacity-70">
                    <td className="p-3">
                      <div className="font-semibold text-sm text-gray-800">ผู้ดูแลระบบสูงสุด (System)</div>
                    </td>
                    <td className="p-3 text-sm">admin / admin123</td>
                    <td className="p-3"><span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">⚔️ Super Admin</span></td>
                    <td className="p-3 text-center text-xs text-gray-400">ห้ามลบ/แก้ไข</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
