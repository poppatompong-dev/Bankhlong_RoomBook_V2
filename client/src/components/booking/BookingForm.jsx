import { useState, useMemo } from 'react';
import { TIME_SLOTS, formatDateTH, timeDiff } from '../../utils/helpers';

export default function BookingForm({ rooms, selectedDate, selectedRoom, onBook, onClose }) {
  const [form, setForm] = useState({
    purpose: '',
    startTime: '',
    endTime: '',
    roomId: selectedRoom?._id || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // We need availability data - for now use simplified client-side check
  const bookedSlots = useMemo(() => new Set(), []);

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
    if (!form.purpose.trim()) e.purpose = 'กรุณากรอกวัตถุประสงค์';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!form.roomId) e.roomId = 'กรุณาเลือกห้อง';
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
        roomId: form.roomId,
        date: selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose
      });
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  const roomObj = rooms.find(r => r._id === form.roomId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="font-prompt text-lg font-semibold text-gray-800">📝 จองห้องประชุม</div>
            <div className="text-xs text-gray-400 mt-0.5">{formatDateTH(selectedDate)}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all border-none cursor-pointer">✕</button>
        </div>

        {/* Steps */}
        <div className="px-7 pt-4">
          <div className="flex items-center gap-2 mb-6">
            {[
              { n: 1, label: 'รายละเอียด' },
              { n: 2, label: 'ห้องและเวลา' },
              { n: 3, label: 'ยืนยัน' }
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 text-xs font-medium ${step >= s.n ? (step > s.n ? 'text-green-600' : 'text-teal-600') : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${step > s.n ? 'bg-green-400 text-white' : step === s.n ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-7 pb-2">
          {/* Step 1: Purpose */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">วัตถุประสงค์ *</label>
                <textarea className="form-control" rows="3" placeholder="ระบุวัตถุประสงค์การใช้ห้องประชุม"
                  value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                {errors.purpose && <div className="text-xs text-red-500 mt-1">{errors.purpose}</div>}
              </div>
            </div>
          )}

          {/* Step 2: Room & Time */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ห้องประชุม *</label>
                <select className="form-control cursor-pointer" value={form.roomId}
                  onChange={e => { set('roomId', e.target.value); set('startTime', ''); set('endTime', ''); }}>
                  <option value="">-- เลือกห้อง --</option>
                  {rooms.map(r => <option key={r._id} value={r._id}>{r.icon} {r.name} ({r.capacity} ที่นั่ง)</option>)}
                </select>
                {errors.roomId && <div className="text-xs text-red-500 mt-1">{errors.roomId}</div>}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">เวลาเริ่ม *</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.slice(0, -1).map(t => (
                    <button key={t} type="button"
                      className={`time-pill ${form.startTime === t ? 'selected' : ''} ${bookedSlots.has(t) ? 'disabled' : ''}`}
                      onClick={() => !bookedSlots.has(t) && (set('startTime', t), set('endTime', ''))}
                      disabled={bookedSlots.has(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                {errors.startTime && <div className="text-xs text-red-500 mt-1">{errors.startTime}</div>}
              </div>

              {form.startTime && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">เวลาสิ้นสุด * (สูงสุด 4 ชั่วโมง)</label>
                  <div className="flex flex-wrap gap-2">
                    {endOptions.map(t => {
                      const dur = timeDiff(form.startTime, t);
                      return (
                        <button key={t} type="button"
                          className={`time-pill ${form.endTime === t ? 'selected' : ''}`}
                          onClick={() => set('endTime', t)}>
                          {t} <span className="text-xs opacity-70">({dur / 60}ชม.)</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.endTime && <div className="text-xs text-red-500 mt-1">{errors.endTime}</div>}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <div className="font-prompt font-bold text-sm mb-4 text-teal-700">📋 สรุปการจอง</div>
                {[
                  ['🏢 ห้อง', roomObj ? `${roomObj.icon} ${roomObj.name}` : '-'],
                  ['📅 วันที่', formatDateTH(selectedDate)],
                  ['⏰ เวลา', `${form.startTime} – ${form.endTime} น.`],
                  ['⏱️ ระยะเวลา', form.startTime && form.endTime ? `${timeDiff(form.startTime, form.endTime) / 60} ชั่วโมง` : '-'],
                  ['📝 วัตถุประสงค์', form.purpose]
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 mb-2.5 text-sm">
                    <span className="min-w-[120px] text-gray-500 font-semibold">{k}</span>
                    <span className="text-gray-800">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-xs text-teal-700 flex gap-2 items-start" style={{ background: '#ccfbf1' }}>
                <span>📲</span>
                <span>ระบบจะส่งการแจ้งเตือน LINE และสร้างนัดหมายใน Google Calendar โดยอัตโนมัติ (เมื่ออนุมัติ)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex gap-3 justify-end">
          {step > 1 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← ย้อนกลับ</button>}
          {step < 3 && (
            <button className="btn-primary" onClick={() => {
              if (step === 1 && validate1()) setStep(2);
              else if (step === 2 && validate2()) setStep(3);
            }}>ถัดไป →</button>
          )}
          {step === 3 && (
            <button className="btn-primary btn-lg" onClick={submit} disabled={loading}>
              {loading ? <><span className="loader"></span> กำลังจอง...</> : '✅ ยืนยันการจอง'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
