import { useState, useEffect, useMemo } from 'react';
import { bookingsAPI, roomsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { formatDateTH, timeDiff, getStatusBadge } from '../utils/helpers';

export default function Admin() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const { showToast } = useToast();
  const { socket } = useSocket();

  const fetchData = async () => {
    try {
      const [bRes, rRes, aRes] = await Promise.all([
        bookingsAPI.list({ userId: 'all' }),
        roomsAPI.list(),
        bookingsAPI.analytics()
      ]);
      setBookings(bRes.data.bookings || []);
      setRooms(rRes.data);
      setAnalytics(aRes.data);
    } catch { showToast('ไม่สามารถโหลดข้อมูลได้', 'error'); }
    finally { setLoading(false); }
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

  const filtered = useMemo(() =>
    bookings
      .filter(b => !filterStatus || b.status === filterStatus)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [bookings, filterStatus]);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const approvedCount = bookings.filter(b => b.status === 'approved').length;
  const cancelledCount = bookings.filter(b => b.status === 'cancelled').length;

  const handleApprove = async (id) => {
    try {
      await bookingsAPI.update(id, { status: 'approved' });
      showToast('✅ อนุมัติการจองสำเร็จ', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await bookingsAPI.update(id, { status: 'cancelled' });
      showToast('❌ ปฏิเสธการจองแล้ว', 'info');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="loader border-teal-500 border-t-white" style={{width:32,height:32,borderWidth:3}}></div>
    </div>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-prompt text-xl font-bold text-gray-800">🛡️ แดชบอร์ดผู้ดูแล</h1>
        <p className="text-sm text-gray-400">จัดการการจองทั้งหมดในระบบ</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '📋', label: 'ทั้งหมด', value: bookings.length, cls: 'bg-green-100' },
          { icon: '⏳', label: 'รออนุมัติ', value: pendingCount, cls: 'bg-amber-50' },
          { icon: '✅', label: 'อนุมัติแล้ว', value: approvedCount, cls: 'bg-teal-50' },
          { icon: '❌', label: 'ยกเลิก', value: cancelledCount, cls: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="font-prompt text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending approval highlight */}
      {pendingCount > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <div className="text-sm font-semibold text-amber-800">มี {pendingCount} รายการรออนุมัติ</div>
            <div className="text-xs text-amber-600">กรุณาตรวจสอบและอนุมัติการจองที่รอดำเนินการ</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body py-3 px-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { value: '', label: 'ทั้งหมด', count: bookings.length },
              { value: 'pending', label: '⏳ รออนุมัติ', count: pendingCount },
              { value: 'approved', label: '✅ อนุมัติ', count: approvedCount },
              { value: 'cancelled', label: '❌ ยกเลิก', count: cancelledCount },
            ].map(f => (
              <button key={f.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-none cursor-pointer
                  ${filterStatus === f.value ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                onClick={() => setFilterStatus(f.value)}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <div className="text-sm">ไม่พบรายการ</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['#','ผู้จอง','ห้อง','วันที่','เวลา','วัตถุประสงค์','สถานะ','จัดการ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const room = typeof b.roomId === 'object' ? b.roomId : rooms.find(r => r._id === b.roomId);
                  const userName = typeof b.userId === 'object' ? b.userId.name : 'N/A';
                  const userEmail = typeof b.userId === 'object' ? b.userId.email : '';
                  const status = getStatusBadge(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-green-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold">{userName}</div>
                        <div className="text-xs text-gray-400">{userEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{room?.icon} {room?.name}</td>
                      <td className="px-4 py-3 text-xs text-teal-600 font-medium">{formatDateTH(b.date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{b.startTime}–{b.endTime}</td>
                      <td className="px-4 py-3 text-sm max-w-[150px] truncate">{b.purpose}</td>
                      <td className="px-4 py-3"><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {b.status === 'pending' && (
                            <>
                              <button className="btn-primary btn-sm" onClick={() => handleApprove(b._id)}>อนุมัติ</button>
                              <button className="btn-danger btn-sm" onClick={() => handleReject(b._id)}>ปฏิเสธ</button>
                            </>
                          )}
                          {b.status === 'approved' && (
                            <button className="btn-danger btn-sm" onClick={() => handleReject(b._id)}>ยกเลิก</button>
                          )}
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
    </main>
  );
}
