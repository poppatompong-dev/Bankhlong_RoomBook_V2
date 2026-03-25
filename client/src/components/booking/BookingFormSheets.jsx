import { useState, useMemo } from 'react';
import { TIME_SLOTS, formatDateTH, timeDiff } from '../../utils/helpers';

export default function BookingFormSheets({ rooms, selectedDate, selectedRoom, bookings = [], onBook, onClose }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    purpose: '',
    room: selectedRoom?.name || '',
    startTime: '',
    endTime: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Booked slots for the selected room on the selected date
  const bookedSlots = useMemo(() => {
    const s = new Set();
    if (!form.room) return s;
    bookings
      .filter(b => b.room === form.room && b.status !== 'cancelled')
      .forEach(b => {
        TIME_SLOTS.forEach(t => {
          if (t >= b.startTime && t < b.endTime) s.add(t);
        });
      });
    return s;
  }, [form.room, bookings]);

  const endOptions = useMemo(() => {
    if (!form.startTime) return [];
    const idx = TIME_SLOTS.indexOf(form.startTime);
    const opts = [];
    for (let i = idx + 1; i <= Math.min(idx + 8, TIME_SLOTS.length - 1); i++) {
      const t = TIME_SLOTS[i];
      const blocked = TIME_SLOTS.slice(idx + 1, i).some(s => bookedSlots.has(s));
      if (!blocked) opts.push(t); else break;
    }
    return opts;
  }, [form.startTime, bookedSlots]);

  const validate1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.phone.trim()) e.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!/^[0-9]{9,10}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = 'เบอร์โทรไม่ถูกต้อง';
    if (!form.purpose.trim()) e.purpose = 'กรุณากรอกวัตถุประสงค์';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!form.room) e.room = 'กรุณาเลือกห้องประชุม';
    if (!form.startTime) e.startTime = 'กรุณาเลือกเวลาเริ่ม';
    if (!form.endTime) e.endTime = 'กรุณาเลือกเวลาสิ้นสุด';
    if (form.startTime && form.endTime) {
      const dur = timeDiff(form.startTime, form.endTime);
      if (dur > 240) e.endTime = 'สูงสุด 4 ชั่วโมง';
      if (dur <= 0) e.endTime = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setLoading(true);
    try {
      await onBook({
        name: form.name.trim(),
        phone: form.phone.trim(),
        room: form.room,
        date: selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose.trim()
      });
    } catch {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  const roomObj = rooms.find(r => r.name === form.room);
  const dur = form.startTime && form.endTime ? timeDiff(form.startTime, form.endTime) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <div className="font-bold text-lg text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>
              📝 จองห้องประชุม
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{formatDateTH(selectedDate)}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all border-none cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: 'ข้อมูลผู้จอง' },
              { n: 2, label: 'ห้องและเวลา' },
              { n: 3, label: 'ยืนยัน' }
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 text-xs font-medium ${step >= s.n ? (step > s.n ? 'text-green-600' : 'text-teal-600') : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${step > s.n ? 'bg-green-400 text-white' : step === s.n ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="hidden sm:inline whitespace-nowrap" style={{ fontFamily: 'Sarabun, sans-serif' }}>{s.label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Step 1: ข้อมูลผู้จอง */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="กรอกชื่อ-นามสกุลผู้จอง"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
                {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="0xx-xxx-xxxx"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                />
                {errors.phone && <div className="text-xs text-red-500 mt-1">{errors.phone}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  วัตถุประสงค์ *
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="ระบุวัตถุประสงค์การใช้ห้องประชุม เช่น ประชุมทีม, อบรม, สัมมนา"
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                />
                {errors.purpose && <div className="text-xs text-red-500 mt-1">{errors.purpose}</div>}
              </div>
            </div>
          )}

          {/* Step 2: ห้องและเวลา */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  ห้องประชุม *
                </label>
                <select
                  className="form-control cursor-pointer"
                  value={form.room}
                  onChange={e => { set('room', e.target.value); set('startTime', ''); set('endTime', ''); }}
                >
                  <option value="">-- เลือกห้องประชุม --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.name}>
                      {r.icon} {r.name} ({r.capacity} ที่นั่ง)
                    </option>
                  ))}
                </select>
                {errors.room && <div className="text-xs text-red-500 mt-1">{errors.room}</div>}
              </div>

              {/* Booked slots info */}
              {form.room && bookedSlots.size > 0 && (
                <div className="p-3 rounded-xl text-xs text-amber-700 flex gap-2 items-start"
                  style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                  <span>⚠️</span>
                  <span>ห้องนี้มีการจองบางช่วงเวลาแล้ว ช่วงเวลาที่แสดงสีเทาไม่สามารถเลือกได้</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  เวลาเริ่มต้น *
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.slice(0, -1).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`time-pill ${form.startTime === t ? 'selected' : ''} ${bookedSlots.has(t) ? 'disabled' : ''}`}
                      onClick={() => !bookedSlots.has(t) && (set('startTime', t), set('endTime', ''))}
                      disabled={bookedSlots.has(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {errors.startTime && <div className="text-xs text-red-500 mt-1">{errors.startTime}</div>}
              </div>

              {form.startTime && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                    style={{ fontFamily: 'Sarabun, sans-serif' }}>
                    เวลาสิ้นสุด * (สูงสุด 4 ชั่วโมง)
                  </label>
                  {endOptions.length === 0 ? (
                    <p className="text-xs text-red-500">ช่วงเวลาถัดไปถูกจองแล้ว กรุณาเลือกเวลาเริ่มอื่น</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {endOptions.map(t => {
                        const d = timeDiff(form.startTime, t);
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`time-pill ${form.endTime === t ? 'selected' : ''}`}
                            onClick={() => set('endTime', t)}
                          >
                            {t} <span className="text-xs opacity-70">({d / 60}ชม.)</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors.endTime && <div className="text-xs text-red-500 mt-1">{errors.endTime}</div>}
                </div>
              )}
            </div>
          )}

          {/* Step 3: ยืนยัน */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="rounded-2xl p-5 border border-green-200" style={{ background: '#f0fdf9' }}>
                <div className="font-bold text-sm mb-4 text-teal-700" style={{ fontFamily: 'Prompt, sans-serif' }}>
                  📋 สรุปการจอง
                </div>
                {[
                  ['👤 ผู้จอง', form.name],
                  ['📞 เบอร์โทร', form.phone],
                  ['🏢 ห้อง', roomObj ? `${roomObj.icon} ${form.room}` : form.room],
                  ['📅 วันที่', formatDateTH(selectedDate)],
                  ['⏰ เวลา', `${form.startTime} – ${form.endTime} น.`],
                  ['⏱️ ระยะเวลา', dur > 0 ? `${dur / 60} ชั่วโมง` : '-'],
                  ['📝 วัตถุประสงค์', form.purpose]
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 mb-2.5 text-sm">
                    <span className="min-w-[130px] text-gray-500 font-semibold flex-shrink-0"
                      style={{ fontFamily: 'Sarabun, sans-serif' }}>{k}</span>
                    <span className="text-gray-800" style={{ fontFamily: 'Sarabun, sans-serif' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs text-teal-700 flex gap-2 items-start"
                style={{ background: '#ccfbf1' }}>
                <span>✅</span>
                <span style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  ระบบจะบันทึกข้อมูลลง Google Sheets ทันที กรุณาตรวจสอบข้อมูลก่อนยืนยัน
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex gap-3 justify-end border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← ย้อนกลับ</button>
          )}
          {step < 3 && (
            <button className="btn-primary" onClick={() => {
              if (step === 1 && validate1()) setStep(2);
              else if (step === 2 && validate2()) setStep(3);
            }}>
              ถัดไป →
            </button>
          )}
          {step === 3 && (
            <button className="btn-primary btn-lg" onClick={submit} disabled={loading}>
              {loading
                ? <><span className="loader"></span>&nbsp;กำลังจอง...</>
                : '✅ ยืนยันการจอง'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
