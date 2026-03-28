import { useState, useEffect, useMemo, useCallback } from 'react';
import { roomsAPI, bookingsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import Calendar from '../components/calendar/Calendar';
import BookingForm from '../components/booking/BookingForm';
import { formatDateTH, today, getStatusBadge } from '../utils/helpers';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        roomsAPI.list(),
        bookingsAPI.list({ limit: 500 })  // โหลดทั้งหมด เพื่อ detect conflict
      ]);
      setRooms(roomsRes.data.rooms || []);
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);  // ไม่ depend on selectedDate

  useEffect(() => { fetchData(); }, [fetchData]);

  // เมื่อ selectedDate เปลี่ยน ไม่ต้อง re-fetch ทั้งหมด — filter จาก state ที่มีอยู่แล้ว

  // Real-time updates
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
  }, [socket, fetchData]);

  const bookingsForDate = useMemo(() =>
    bookings.filter(b => b.date === selectedDate && b.status !== 'cancelled'),
  [bookings, selectedDate]);

  const bookedRoomIds = useMemo(() => {
    const ids = new Set();
    bookingsForDate.forEach(b => {
      const roomId = typeof b.roomId === 'object' ? b.roomId._id : b.roomId;
      ids.add(roomId);
    });
    return ids;
  }, [bookingsForDate]);

  const handleBook = async (formData) => {
    try {
      await bookingsAPI.create(formData);
      showToast('✅ จองห้องประชุมสำเร็จ! อนุมัติทันที', 'success');
      setShowForm(false);
      setSelectedRoom(null);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.message
        || 'เกิดข้อผิดพลาดในการจอง';
      showToast(msg, 'error');
      throw err;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="loader border-teal-500 border-t-white mx-auto mb-4" style={{width:32,height:32,borderWidth:3}}></div>
        <p className="text-gray-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-prompt text-xl font-bold text-gray-800">🏠 แดชบอร์ด</h1>
          <p className="text-sm text-gray-400">วันที่ {formatDateTH(selectedDate)} · {bookingsForDate.length} การจองวันนี้</p>
        </div>
        <button className="btn-primary btn-lg" onClick={() => {
          if (!selectedDate) {
            showToast('กรุณาเลือกวันที่บนปฏิทินก่อนจองห้องประชุม', 'warning');
          } else {
            setShowForm(true);
          }
        }}>+ จองห้องประชุม</button>
      </div>

      {/* Grid: Calendar + Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Calendar */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 ปฏิทิน</div>
            <span className="badge badge-info">เลือกวันที่</span>
          </div>
          <div className="card-body">
            <Calendar 
              selected={selectedDate} 
              onSelect={(d) => { 
                setSelectedDate(d); 
                setSelectedRoom(null);
                setShowForm(true); 
              }} 
              bookings={bookings} 
              onQuickBook={(d) => { 
                setSelectedDate(d); 
                setSelectedRoom(null);
                setShowForm(true); 
              }} 
            />
            <div className={`mt-4 p-3 rounded-lg text-sm ${selectedDate ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
              📅 วันที่เลือก: {selectedDate ? <strong>{formatDateTH(selectedDate)}</strong> : 'ยังไม่ได้เลือกวันที่'}
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏢 ห้องประชุม</div>
            {selectedDate && <span className="badge badge-success">{rooms.length - bookedRoomIds.size} ว่าง</span>}
          </div>
          <div className="card-body p-4">
            <div className="flex flex-col gap-3">
              {rooms.map(room => {
                const isBooked = bookedRoomIds.has(room._id);
                const roomBookings = bookingsForDate.filter(b => {
                  const rid = typeof b.roomId === 'object' ? b.roomId._id : b.roomId;
                  return rid === room._id;
                });
                return (
                  <div key={room._id}
                    className={`room-card ${isBooked ? 'booked' : 'available'} ${selectedRoom?._id === room._id ? 'selected' : ''}`}
                    onClick={() => { 
                      if (!selectedDate) {
                        showToast('กรุณาเลือกวันที่บนปฏิทินก่อนเลือกห้อง', 'warning');
                      } else if (!isBooked) { 
                        setSelectedRoom(room); 
                        setShowForm(true); 
                      } 
                    }}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{room.icon}</span>
                      <div className="flex-1">
                        <div className="font-prompt text-sm font-semibold text-gray-800 mb-0.5">{room.name}</div>
                        <div className="text-xs text-gray-500">👥 {room.capacity} ที่นั่ง · ชั้น {room.floor}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold
                        ${isBooked ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-600'}`}>
                        {isBooked ? '❌ ถูกจอง' : '✅ ว่าง'}
                      </span>
                    </div>
                    {roomBookings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {roomBookings.slice(0, 3).map(b => (
                          <span key={b._id} className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded">
                            {b.startTime}–{b.endTime}
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

      {/* Today's bookings table */}
      {bookingsForDate.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <div className="card-title">📋 การจองวันนี้</div>
            <span className="badge badge-warning">{bookingsForDate.length} รายการ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">ผู้จอง</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">ห้อง</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">เวลา</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">วัตถุประสงค์</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {bookingsForDate.map(b => {
                  const roomName = b.room || b.roomId?.name || 'ไม่ระบุชื่อห้อง';
                  const roomIcon = b.roomIcon || '🏢';
                  const userName = b.name || (b.userId?.name) || 'ไม่ระบุชื่อ';
                  const status = getStatusBadge(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-green-50 transition-colors">
                      <td className="px-4 py-3.5 text-sm">
                        <div className="font-semibold">{userName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm">{roomIcon} {roomName}</td>
                      <td className="px-4 py-3.5 text-sm">
                        <span className="font-semibold text-teal-600">{b.startTime}</span>
                        <span className="text-gray-400"> – </span>
                        <span className="font-semibold text-teal-600">{b.endTime}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm max-w-[200px] truncate">{b.purpose}</td>
                      <td className="px-4 py-3.5"><span className={`badge ${status.cls}`}>{status.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showForm && (
        <BookingForm
          rooms={rooms}
          selectedDate={selectedDate}
          selectedRoom={selectedRoom}
          onBook={handleBook}
          onClose={() => { setShowForm(false); setSelectedRoom(null); }}
        />
      )}
    </main>
  );
}
