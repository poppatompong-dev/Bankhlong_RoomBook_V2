import { useState, useEffect, useMemo } from 'react';
import { bookingsAPI, roomsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTH, timeDiff, getStatusBadge } from '../utils/helpers';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        bookingsAPI.list({ userId: user.id }),
        roomsAPI.list()
      ]);
      setBookings(bRes.data.bookings || []);
      setRooms(rRes.data);
    } catch { showToast('ไม่สามารถโหลดข้อมูลได้', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() =>
    bookings
      .filter(b => !filterRoom || (typeof b.roomId === 'object' ? b.roomId._id : b.roomId) === filterRoom)
      .filter(b => !filterDate || b.date === filterDate)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  [bookings, filterRoom, filterDate]);

  const handleCancel = async (id) => {
    try {
      await bookingsAPI.cancel(id);
      showToast('ยกเลิกการจองสำเร็จ', 'success');
      setCancelConfirm(null);
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
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-prompt text-xl font-bold text-gray-800">📋 การจองของฉัน</h1>
          <p className="text-sm text-gray-400">{filtered.length} รายการทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body py-3 px-6">
          <div className="flex gap-3 flex-wrap items-center">
            <select className="form-control max-w-[200px]" value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
              <option value="">🏢 ทุกห้อง</option>
              {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
            <input type="date" className="form-control max-w-[200px]" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            <button className="btn-secondary btn-sm" onClick={() => { setFilterRoom(''); setFilterDate(''); }}>ล้างตัวกรอง</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">📭</div>
              <div className="text-base font-medium text-gray-500">ไม่พบรายการจอง</div>
              <div className="text-sm">ลองเปลี่ยนตัวกรองหรือสร้างการจองใหม่</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['#','ห้อง','วันที่','เวลา','วัตถุประสงค์','สถานะ','จัดการ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const room = typeof b.roomId === 'object' ? b.roomId : rooms.find(r => r._id === b.roomId);
                  const status = getStatusBadge(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-green-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 text-sm">{room?.icon} {room?.name}</td>
                      <td className="px-4 py-3 text-xs text-teal-600 font-medium">{formatDateTH(b.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold">{b.startTime}</span> – <span className="font-semibold">{b.endTime}</span>
                        <div className="text-xs text-gray-400">{timeDiff(b.startTime, b.endTime) / 60} ชม.</div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[180px] truncate">{b.purpose}</td>
                      <td className="px-4 py-3"><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td className="px-4 py-3">
                        {b.status !== 'cancelled' && (
                          <button className="btn-danger btn-sm" onClick={() => setCancelConfirm(b)}>ยกเลิก</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Cancel confirm */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fade-in"
          onClick={e => e.target === e.currentTarget && setCancelConfirm(null)}>
          <div className="bg-white rounded-3xl max-w-[400px] w-full animate-slide-up" style={{boxShadow:'0 25px 60px rgba(0,0,0,0.25)'}}>
            <div className="px-7 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-prompt text-lg font-semibold text-gray-800">⚠️ ยืนยันการยกเลิก</div>
              <button onClick={() => setCancelConfirm(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all border-none cursor-pointer">✕</button>
            </div>
            <div className="px-7 py-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                คุณต้องการยกเลิกการจอง<br />
                <strong>{typeof cancelConfirm.roomId === 'object' ? cancelConfirm.roomId.name : ''}</strong><br />
                วันที่ {formatDateTH(cancelConfirm.date)} เวลา {cancelConfirm.startTime}–{cancelConfirm.endTime} น.
              </p>
            </div>
            <div className="px-7 pb-6 flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setCancelConfirm(null)}>ยกเลิก</button>
              <button className="btn-danger" onClick={() => handleCancel(cancelConfirm._id)}>ยืนยันการยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
