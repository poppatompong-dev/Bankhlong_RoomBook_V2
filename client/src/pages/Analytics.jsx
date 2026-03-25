import { useState, useEffect } from 'react';
import { bookingsAPI, roomsAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aRes, rRes] = await Promise.all([
          bookingsAPI.analytics(),
          roomsAPI.list()
        ]);
        setAnalytics(aRes.data);
        setRooms(rRes.data);
      } catch { showToast('ไม่สามารถโหลดสถิติได้', 'error'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="loader border-teal-500 border-t-white" style={{width:32,height:32,borderWidth:3}}></div>
    </div>
  );

  const stats = [
    { icon: '📋', label: 'การจองทั้งหมด', value: analytics?.totalBookings || 0, cls: 'bg-green-100' },
    { icon: '🏢', label: 'ห้องทั้งหมด', value: rooms.length, cls: 'bg-teal-50' },
    { icon: '🔥', label: 'ชั่วโมงยอดนิยม', value: analytics?.peakHours?.[0]?.time || '-', cls: 'bg-blue-50' },
    { icon: '📅', label: 'วันที่ยุ่งที่สุด', value: ['อา','จ','อ','พ','พฤ','ศ','ส'][analytics?.busiestDay] || '-', cls: 'bg-amber-50' }
  ];

  const maxRoomCount = Math.max(...(analytics?.roomUtilization?.map(r => r.bookingCount) || [1]), 1);
  const maxHourCount = Math.max(...(analytics?.peakHours?.map(h => h.count) || [1]), 1);

  return (
    <main className="max-w-[1400px] mx-auto px-6 py-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="font-prompt text-xl font-bold text-gray-800">📊 สถิติการใช้งาน</h1>
        <p className="text-sm text-gray-400">ข้อมูลการจองห้องประชุมทั้งหมด</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div>
              <div className="font-prompt text-2xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room utilization */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏢 การใช้งานแต่ละห้อง</div>
          </div>
          <div className="card-body">
            {(analytics?.roomUtilization || []).map(ru => {
              const pct = maxRoomCount > 0 ? (ru.bookingCount / maxRoomCount) * 100 : 0;
              return (
                <div key={ru.room._id} className="mb-4">
                  <div className="flex justify-between mb-1.5 text-sm">
                    <span>{ru.room.icon} {ru.room.name}</span>
                    <span className="font-bold text-teal-600">{ru.bookingCount} ครั้ง</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak hours */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⏰ ช่วงเวลายอดนิยม</div>
          </div>
          <div className="card-body">
            {(analytics?.peakHours || []).length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm">ยังไม่มีข้อมูล</div>
              </div>
            ) : (
              analytics.peakHours.map(h => {
                const pct = maxHourCount > 0 ? (h.count / maxHourCount) * 100 : 0;
                return (
                  <div key={h.time} className="mb-3">
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-semibold text-gray-700">⏰ {h.time}</span>
                      <span className="font-bold text-teal-600">{h.count} ครั้ง</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Booking heatmap by hour */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="card-title">🗓️ Heatmap ตามเวลา</div>
          </div>
          <div className="card-body">
            <div className="flex flex-wrap gap-1">
              {Object.entries(analytics?.hourCounts || {}).map(([time, count]) => {
                const intensity = maxHourCount > 0 ? count / maxHourCount : 0;
                return (
                  <div key={time} className="text-center" title={`${time}: ${count} ครั้ง`}>
                    <div className="text-xs text-gray-400 mb-1">{time}</div>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: count === 0 ? '#f1f5f9' : `rgba(20,184,166,${0.2 + intensity * 0.8})`,
                        color: intensity > 0.5 ? 'white' : '#334155'
                      }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
