import { useState, useMemo, useRef } from 'react';
import { TIME_SLOTS, formatDateTH, timeDiff } from '../../utils/helpers';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function fileIcon(type) {
  if (type.startsWith('image/')) return '🖼️';
  if (type.includes('pdf')) return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📎';
}

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
  const [files, setFiles] = useState([]); // { file, preview, name, size, type }
  const fileRef = useRef(null);

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

  // ─── File handling ────────────────────────────────────────────────────────
  const handleFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    const valid = incoming.filter(f => {
      if (!ALLOWED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });
    const remain = MAX_FILES - files.length;
    const toAdd = valid.slice(0, remain).map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setFiles(prev => [...prev, ...toAdd]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (idx) => {
    setFiles(prev => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  // ─── Validation ───────────────────────────────────────────────────────────
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
    if (!validate2()) return;
    setLoading(true);
    try {
      // Convert files to base64 for transport
      const attachments = await Promise.all(files.map(f => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: f.name, type: f.type, size: f.size, data: reader.result });
        reader.readAsDataURL(f.file);
      })));

      await onBook({
        name: form.name.trim(),
        phone: form.phone.trim(),
        room: form.room,
        date: selectedDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose.trim(),
        attachments: attachments.length > 0 ? attachments : undefined
      });
    } catch {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  const roomObj = rooms.find(r => r.name === form.room);
  const dur = form.startTime && form.endTime ? timeDiff(form.startTime, form.endTime) : 0;
  const canSubmit = form.room && form.startTime && form.endTime && dur > 0 && dur <= 240;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[580px] max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <div className="font-bold text-lg text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>
              📝 จองห้องประชุม
            </div>
            <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>
              {formatDateTH(selectedDate)} · การจองมีผลทันที
            </div>
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
              { n: 2, label: 'ห้อง เวลา และไฟล์แนบ' }
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 text-xs font-medium ${step >= s.n ? (step > s.n ? 'text-green-600' : 'text-teal-600') : 'text-gray-400'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${step > s.n ? 'bg-green-400 text-white' : step === s.n ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="hidden sm:inline whitespace-nowrap" style={{ fontFamily: 'Sarabun, sans-serif' }}>{s.label}</span>
                </div>
                {i < 1 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`}></div>}
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

          {/* Step 2: ห้อง เวลา ไฟล์แนบ */}
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
                  style={{ background: '#fef3c7', border: '1px solid #fde68a', fontFamily: 'Sarabun, sans-serif' }}>
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
                    <p className="text-xs text-red-500" style={{ fontFamily: 'Sarabun, sans-serif' }}>ช่วงเวลาถัดไปถูกจองแล้ว กรุณาเลือกเวลาเริ่มอื่น</p>
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

              {/* File attachments */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  📎 แนบไฟล์ประกอบ (ไม่บังคับ · สูงสุด {MAX_FILES} ไฟล์)
                </label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer transition-all hover:border-teal-300 hover:bg-teal-50/30"
                  onClick={() => files.length < MAX_FILES && fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={handleFiles}
                  />
                  <div className="text-2xl mb-1">📂</div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Sarabun, sans-serif' }}>
                    คลิกเพื่อเลือกไฟล์ · รูปภาพ, PDF, Word, Excel (สูงสุด 5MB/ไฟล์)
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative group">
                        {f.preview ? (
                          <img src={f.preview} alt={f.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg border border-gray-200 flex flex-col items-center justify-center bg-gray-50">
                            <span className="text-lg">{fileIcon(f.type)}</span>
                            <span className="text-[8px] text-gray-400 mt-0.5 px-1 truncate max-w-full">{f.name.split('.').pop()}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ lineHeight: 1 }}
                        >✕</button>
                        <div className="text-[8px] text-gray-400 text-center mt-0.5 truncate max-w-[64px]">{f.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick summary before submit */}
              {canSubmit && (
                <div className="rounded-xl p-4 border border-teal-200" style={{ background: '#f0fdf9' }}>
                  <div className="text-xs font-bold text-teal-700 mb-2" style={{ fontFamily: 'Prompt, sans-serif' }}>
                    ⚡ สรุปการจอง — กดยืนยันเพื่อจองทันที
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ fontFamily: 'Sarabun, sans-serif' }}>
                    <span className="text-gray-500">👤 {form.name}</span>
                    <span className="text-gray-500">📞 {form.phone}</span>
                    <span className="text-gray-700 font-semibold">{roomObj?.icon} {form.room}</span>
                    <span className="text-gray-700 font-semibold">⏰ {form.startTime}–{form.endTime} ({dur / 60}ชม.)</span>
                  </div>
                  {files.length > 0 && (
                    <div className="text-[10px] text-teal-600 mt-1">📎 แนบ {files.length} ไฟล์</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 flex gap-3 justify-end border-t border-gray-100">
          <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(1)}>← ย้อนกลับ</button>
          )}
          {step === 1 && (
            <button className="btn-primary" onClick={() => { if (validate1()) setStep(2); }}>
              ถัดไป →
            </button>
          )}
          {step === 2 && (
            <button className="btn-primary btn-lg" onClick={submit} disabled={loading || !canSubmit}>
              {loading
                ? <><span className="loader"></span>&nbsp;กำลังจอง...</>
                : '⚡ จองทันที'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
