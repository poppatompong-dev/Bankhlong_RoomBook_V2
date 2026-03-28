import { useState, useMemo, useRef } from 'react';
import { TIME_SLOTS, formatDateTH, timeDiff } from '../../utils/helpers';

const LAYOUTS = [
  { value: 'classroom', label: '🎓 ห้องเรียน (Classroom)' },
  { value: 'conference', label: '🪑 ประชุมกลุ่ม (Conference)' },
  { value: 'ushape', label: '🔵 ยู-เชฟ (U-Shape)' },
  { value: 'theater', label: '🎭 เธียเตอร์ (Theater)' },
  { value: 'banquet', label: '🍽️ แบงควิต (Banquet)' },
  { value: 'other', label: '📐 อื่นๆ (ระบุ)' },
];
const DRESS_CODES = ['', 'ชุดสุภาพ', 'ชุดข้าราชการ / เครื่องแบบ', 'ชุดลำลอง', 'ชุดฟอร์มหน่วยงาน', 'อื่นๆ'];
const EQUIP_LIST = [
  { key: 'sound', label: '🔊 ระบบเครื่องเสียง' },
  { key: 'projector', label: '📽️ โปรเจคเตอร์' },
  { key: 'tv', label: '📺 จอทีวี / จอภาพ' },
  { key: 'laptop', label: '💻 คอมพิวเตอร์โน้ตบุ๊ก' },
  { key: 'whiteboard', label: '🗒️ กระดานไวท์บอร์ด' },
  { key: 'flipchart', label: '📋 ฟลิปชาร์ต / ปากกา' },
  { key: 'videoConference', label: '📹 วิดีโอคอนเฟอเรนซ์' },
  { key: 'internet', label: '🌐 อินเทอร์เน็ตพิเศษ' },
];
const SVC_LIST = [
  { key: 'water', label: '💧 น้ำดื่ม' },
  { key: 'coffee', label: '☕ กาแฟ / ชา / ของว่าง' },
  { key: 'nameCards', label: '🪧 ป้ายชื่อโต๊ะ' },
  { key: 'signage', label: '🖼️ ป้ายไวนิล / ป้ายหน้างาน' },
];

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

const LBL = ({ children, req }) => (
  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider" style={{ fontFamily: 'Sarabun, sans-serif' }}>
    {children}{req && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);
const Err = ({ msg }) => msg ? <div className="text-xs text-red-500 mt-1">{msg}</div> : null;
const Chip = ({ checked, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${checked ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}
    style={{ fontFamily: 'Sarabun, sans-serif' }}>
    {children}
  </button>
);

export default function BookingFormSheets({ rooms, selectedDate, selectedRoom, bookings = [], onBook, onClose }) {
  const initEq = { sound: false, micCount: 0, micType: '', projector: false, tv: false, laptop: false, whiteboard: false, flipchart: false, videoConference: false, internet: false, other: '' };
  const initSvc = { water: false, waterTime: '', coffee: false, nameCards: false, signage: false, extraArea: '' };

  const [form, setForm] = useState({
    name: '', phone: '', dept: '',
    purpose: '', activity: '',
    attendees: '', roomLayout: '',
    dressCode: '', restrictions: '',
    setupBefore: '', cleanupAfter: '',
    roomId: selectedRoom?._id || '',
    startTime: '', endTime: '',
    equipment: { ...initEq },
    additionalServices: { ...initSvc },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEq = (k, v) => setForm(p => ({ ...p, equipment: { ...p.equipment, [k]: v } }));
  const setSvc = (k, v) => setForm(p => ({ ...p, additionalServices: { ...p.additionalServices, [k]: v } }));

  const bookedSlots = useMemo(() => {
    const s = new Set();
    if (!form.roomId || !selectedDate) return s;
    bookings
      .filter(b => {
        const rid = typeof b.roomId === 'object' ? b.roomId?._id?.toString() : (b.roomId?.toString());
        const bId = typeof b.room === 'string' ? null : rid;
        // match by roomId or by the normalized room id from API response
        return (rid === form.roomId || b.roomId === form.roomId)
          && b.date === selectedDate
          && b.status !== 'cancelled';
      })
      .forEach(b => {
        TIME_SLOTS.forEach(t => { if (t >= b.startTime && t < b.endTime) s.add(t); });
      });
    return s;
  }, [form.roomId, bookings, selectedDate]);

  const endOptions = useMemo(() => {
    if (!form.startTime) return [];
    const idx = TIME_SLOTS.indexOf(form.startTime);
    const opts = [];
    for (let i = idx + 1; i <= Math.min(idx + 16, TIME_SLOTS.length - 1); i++) {
      const t = TIME_SLOTS[i];
      const blocked = TIME_SLOTS.slice(idx + 1, i).some(s => bookedSlots.has(s));
      if (!blocked) opts.push(t); else break;
    }
    return opts;
  }, [form.startTime, bookedSlots]);

  // File handling
  const handleFiles = (e) => {
    const valid = Array.from(e.target.files || []).filter(f => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE);
    const toAdd = valid.slice(0, MAX_FILES - files.length).map(f => ({
      file: f, name: f.name, size: f.size, type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setFiles(prev => [...prev, ...toAdd]);
    if (fileRef.current) fileRef.current.value = '';
  };
  const removeFile = (idx) => setFiles(prev => { const n = [...prev]; if (n[idx].preview) URL.revokeObjectURL(n[idx].preview); n.splice(idx, 1); return n; });

  // Validation
  const validate1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'กรุณากรอกชื่อ-นามสกุล';
    if (!form.phone.trim()) e.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!/^[0-9]{9,10}$/.test(form.phone.replace(/[-\s]/g, ''))) e.phone = 'เบอร์โทรไม่ถูกต้อง';
    if (!form.purpose.trim()) e.purpose = 'กรุณากรอกวัตถุประสงค์หรือชื่อกิจกรรม';
    setErrors(e); return Object.keys(e).length === 0;
  };
  const validate2 = () => {
    const e = {};
    if (!form.roomId) e.room = 'กรุณาเลือกห้องประชุม';
    if (!form.startTime) e.startTime = 'กรุณาเลือกเวลาเริ่ม';
    if (!form.endTime) e.endTime = 'กรุณาเลือกเวลาสิ้นสุด';
    if (form.startTime && form.endTime) {
      const dur = timeDiff(form.startTime, form.endTime);
      if (dur <= 0) e.endTime = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม';
      if (dur > 480) e.endTime = 'สูงสุด 8 ชั่วโมง';
    }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setLoading(true);
    try {
      const attachments = await Promise.all(files.map(f => new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, type: f.type, size: f.size, data: r.result });
        r.readAsDataURL(f.file);
      })));
      await onBook({
        requesterName: form.name.trim(), requesterPhone: form.phone.trim(), requesterDept: form.dept.trim(),
        roomId: form.roomId, date: selectedDate,
        startTime: form.startTime, endTime: form.endTime,
        purpose: form.purpose.trim(), activity: form.activity.trim(),
        attendees: Number(form.attendees) || 0,
        roomLayout: form.roomLayout, dressCode: form.dressCode,
        restrictions: form.restrictions.trim(),
        setupBefore: Number(form.setupBefore) || 0,
        cleanupAfter: Number(form.cleanupAfter) || 0,
        equipment: form.equipment,
        additionalServices: form.additionalServices,
        
      });
    } catch { } finally { setLoading(false); }
  };

  const roomObj = rooms.find(r => r._id === form.roomId);
  const dur = form.startTime && form.endTime ? timeDiff(form.startTime, form.endTime) : 0;
  const canSubmit = form.roomId && form.startTime && form.endTime && dur > 0;

  const STEPS = [
    { n: 1, label: 'ผู้จอง + กิจกรรม' },
    { n: 2, label: 'ห้อง + เวลา' },
    { n: 3, label: 'อุปกรณ์ + บริการ' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[600px] max-h-[95vh] sm:max-h-[93vh] overflow-y-auto animate-slide-up"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <div className="font-bold text-base sm:text-lg text-gray-800" style={{ fontFamily: 'Prompt, sans-serif' }}>📝 จองห้องประชุม</div>
            <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'Sarabun, sans-serif' }}>{formatDateTH(selectedDate)} · อนุมัติทันที</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all border-none cursor-pointer text-sm">✕</button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${step >= s.n ? (step > s.n ? 'text-green-600' : 'text-teal-600') : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step > s.n ? 'bg-green-400 text-white' : step === s.n ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  <span className="hidden sm:inline whitespace-nowrap" style={{ fontFamily: 'Sarabun, sans-serif' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${step > s.n ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">

          {/* ─── Step 1: ผู้จอง + กิจกรรม ─── */}
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <LBL req>ชื่อ-นามสกุลผู้จอง</LBL>
                  <input className="form-control" placeholder="กรอกชื่อ-นามสกุล" value={form.name} onChange={e => set('name', e.target.value)} />
                  <Err msg={errors.name} />
                </div>
                <div>
                  <LBL req>เบอร์โทรศัพท์</LBL>
                  <input className="form-control" type="tel" placeholder="0xx-xxx-xxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  <Err msg={errors.phone} />
                </div>
              </div>
              <div>
                <LBL>หน่วยงาน / กอง / ฝ่าย</LBL>
                <input className="form-control" placeholder="เช่น กองช่าง, สำนักปลัด, กองสาธารณสุข" value={form.dept} onChange={e => set('dept', e.target.value)} />
              </div>
              <div>
                <LBL req>วัตถุประสงค์การใช้ห้อง / ชื่อกิจกรรม</LBL>
                <textarea className="form-control" rows="2" placeholder="เช่น ประชุมคณะกรรมการ, อบรมพนักงาน, สัมมนาผู้บริหาร" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                <Err msg={errors.purpose} />
              </div>
              <div>
                <LBL>ชื่อกิจกรรม / โครงการ (ถ้ามี)</LBL>
                <input className="form-control" placeholder="เช่น โครงการพัฒนาคุณภาพชีวิต ปี 2568" value={form.activity} onChange={e => set('activity', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <LBL>จำนวนผู้เข้าร่วมโดยประมาณ</LBL>
                  <input className="form-control" type="number" min="1" placeholder="จำนวนคน" value={form.attendees} onChange={e => set('attendees', e.target.value)} />
                </div>
                <div>
                  <LBL>การแต่งกายที่กำหนด</LBL>
                  <select className="form-control" value={form.dressCode} onChange={e => set('dressCode', e.target.value)} style={{ fontFamily: 'Sarabun, sans-serif' }}>
                    {DRESS_CODES.map(d => <option key={d} value={d}>{d || '-- ไม่กำหนด --'}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <LBL>ข้อห้าม / ข้อควรปฏิบัติ</LBL>
                <textarea className="form-control" rows="2" placeholder="เช่น ห้ามนำอาหารเข้าห้อง, ห้ามสูบบุหรี่, ควบคุมเสียงไม่เกิน..." value={form.restrictions} onChange={e => set('restrictions', e.target.value)} />
              </div>
            </div>
          )}

          {/* ─── Step 2: ห้อง + เวลา ─── */}
          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <div>
                <LBL req>ห้องประชุม</LBL>
                <select className="form-control cursor-pointer" value={form.roomId} onChange={e => { set('roomId', e.target.value); set('startTime', ''); set('endTime', ''); }} style={{ fontFamily: 'Sarabun, sans-serif' }}>
                  <option value="">-- เลือกห้องประชุม --</option>
                  {rooms.filter(r => r.isActive !== false).map(r => (
                    <option key={r._id} value={r._id}>{r.icon} {r.name} (ความจุ {r.capacity} คน · ชั้น {r.floor})</option>
                  ))}
                </select>
                <Err msg={errors.room} />
              </div>

              <div>
                <LBL>รูปแบบการจัดห้อง</LBL>
                <div className="flex flex-wrap gap-2">
                  {LAYOUTS.map(l => (
                    <Chip key={l.value} checked={form.roomLayout === l.value} onClick={() => set('roomLayout', form.roomLayout === l.value ? '' : l.value)}>{l.label}</Chip>
                  ))}
                </div>
              </div>

              {form.roomId && bookedSlots.size > 0 && (
                <div className="p-3 rounded-xl text-xs text-amber-700 flex gap-2 items-start"
                  style={{ background: '#fef3c7', border: '1px solid #fde68a', fontFamily: 'Sarabun, sans-serif' }}>
                  <span>⚠️</span><span>ห้องนี้มีการจองบางช่วงเวลาแล้ว ช่วงเวลาสีเทาไม่สามารถเลือกได้</span>
                </div>
              )}

              <div>
                <LBL req>เวลาเริ่มต้น</LBL>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_SLOTS.slice(0, -1).map(t => (
                    <button key={t} type="button"
                      className={`time-pill ${form.startTime === t ? 'selected' : ''} ${bookedSlots.has(t) ? 'disabled' : ''}`}
                      onClick={() => !bookedSlots.has(t) && (set('startTime', t), set('endTime', ''))}
                      disabled={bookedSlots.has(t)}>{t}</button>
                  ))}
                </div>
                <Err msg={errors.startTime} />
              </div>

              {form.startTime && (
                <div>
                  <LBL req>เวลาสิ้นสุด (สูงสุด 8 ชั่วโมง)</LBL>
                  {endOptions.length === 0
                    ? <p className="text-xs text-red-500" style={{ fontFamily: 'Sarabun, sans-serif' }}>ช่วงเวลาถัดไปถูกจองแล้ว กรุณาเลือกเวลาเริ่มอื่น</p>
                    : <div className="flex flex-wrap gap-1.5">
                      {endOptions.map(t => {
                        const d = timeDiff(form.startTime, t);
                        return (
                          <button key={t} type="button"
                            className={`time-pill ${form.endTime === t ? 'selected' : ''}`}
                            onClick={() => set('endTime', t)}>
                            {t} <span className="opacity-70 text-[10px]">({d >= 60 ? `${d / 60}ชม.` : `${d}น.`})</span>
                          </button>
                        );
                      })}
                    </div>
                  }
                  <Err msg={errors.endTime} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LBL>เตรียมห้องล่วงหน้า (นาที)</LBL>
                  <input className="form-control" type="number" min="0" step="15" placeholder="0" value={form.setupBefore} onChange={e => set('setupBefore', e.target.value)} />
                </div>
                <div>
                  <LBL>เก็บกวาดหลังใช้งาน (นาที)</LBL>
                  <input className="form-control" type="number" min="0" step="15" placeholder="0" value={form.cleanupAfter} onChange={e => set('cleanupAfter', e.target.value)} />
                </div>
              </div>

              {canSubmit && (
                <div className="rounded-xl p-3 border border-teal-200 text-xs" style={{ background: '#f0fdf9', fontFamily: 'Sarabun, sans-serif' }}>
                  <span className="font-bold text-teal-700">{roomObj?.icon} {roomObj?.name}</span>
                  <span className="text-gray-600 ml-2">⏰ {form.startTime}–{form.endTime} ({dur >= 60 ? `${dur / 60}ชม.` : `${dur}น.`})</span>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 3: อุปกรณ์ + บริการ ─── */}
          {step === 3 && (
            <div className="animate-fade-in space-y-5">
              <div>
                <LBL>ความต้องการอุปกรณ์</LBL>
                <div className="flex flex-wrap gap-2 mb-3">
                  {EQUIP_LIST.map(({ key, label }) => (
                    <Chip key={key} checked={form.equipment[key]} onClick={() => setEq(key, !form.equipment[key])}>{label}</Chip>
                  ))}
                </div>
                {form.equipment.sound && (
                  <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-xl bg-gray-50">
                    <div>
                      <LBL>จำนวนไมโครโฟน</LBL>
                      <input className="form-control" type="number" min="1" placeholder="จำนวน" value={form.equipment.micCount || ''} onChange={e => setEq('micCount', Number(e.target.value))} />
                    </div>
                    <div>
                      <LBL>ประเภทไมโครโฟน</LBL>
                      <input className="form-control" placeholder="เช่น ลอย, ตั้งโต๊ะ, คล้องคอ" value={form.equipment.micType} onChange={e => setEq('micType', e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <LBL>อุปกรณ์อื่นๆ (ระบุเพิ่มเติม)</LBL>
                  <input className="form-control" placeholder="เช่น สายสัญญาณ HDMI, ลำโพงพกพา" value={form.equipment.other} onChange={e => setEq('other', e.target.value)} />
                </div>
              </div>

              <div>
                <LBL>บริการเพิ่มเติม</LBL>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SVC_LIST.map(({ key, label }) => (
                    <Chip key={key} checked={form.additionalServices[key]} onClick={() => setSvc(key, !form.additionalServices[key])}>{label}</Chip>
                  ))}
                </div>
                {form.additionalServices.water && (
                  <div className="mb-3">
                    <LBL>เวลาเสิร์ฟน้ำดื่ม / ของว่าง</LBL>
                    <input className="form-control" placeholder="เช่น 09:00, ก่อนเริ่มประชุม" value={form.additionalServices.waterTime} onChange={e => setSvc('waterTime', e.target.value)} />
                  </div>
                )}
                <div>
                  <LBL>พื้นที่เพิ่มเติมที่ต้องการ</LBL>
                  <input className="form-control" placeholder="เช่น โถงหน้าห้อง, ลานจอดรถ, พื้นที่ลงทะเบียน" value={form.additionalServices.extraArea} onChange={e => setSvc('extraArea', e.target.value)} />
                </div>
              </div>

              {/* File attachments */}
              <div>
                <LBL>📎 เอกสาร / ไฟล์แนบ (ไม่บังคับ · สูงสุด {MAX_FILES} ไฟล์)</LBL>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer transition-all hover:border-teal-300 hover:bg-teal-50/30"
                  onClick={e => { e.stopPropagation(); files.length < MAX_FILES && fileRef.current?.click(); }}>
                  <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFiles} />
                  <div className="text-2xl mb-1">📂</div>
                  <div className="text-xs text-gray-500" style={{ fontFamily: 'Sarabun, sans-serif' }}>คลิกเพื่อเลือกไฟล์ · รูปภาพ, PDF, Word, Excel (สูงสุด 5MB/ไฟล์)</div>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative group">
                        {f.preview
                          ? <img src={f.preview} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                          : <div className="w-16 h-16 rounded-lg border border-gray-200 flex flex-col items-center justify-center bg-gray-50">
                            <span className="text-lg">{fileIcon(f.type)}</span>
                            <span className="text-[8px] text-gray-400 mt-0.5 px-1 truncate max-w-full">{f.name.split('.').pop()}</span>
                          </div>}
                        <button onClick={() => removeFile(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        <div className="text-[8px] text-gray-400 text-center mt-0.5 truncate max-w-[64px]">{f.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {canSubmit && (
                <div className="rounded-xl p-4 border border-teal-200 space-y-1.5 text-xs" style={{ background: '#f0fdf9', fontFamily: 'Sarabun, sans-serif' }}>
                  <div className="font-bold text-teal-700 text-sm" style={{ fontFamily: 'Prompt, sans-serif' }}>📋 สรุปการจอง</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-600">👤 {form.name}</span>
                    <span className="text-gray-600">📞 {form.phone}</span>
                    {form.dept && <span className="text-gray-600 col-span-2">🏢 {form.dept}</span>}
                    <span className="font-semibold text-gray-800">{roomObj?.icon} {roomObj?.name}</span>
                    <span className="font-semibold text-gray-800">⏰ {form.startTime}–{form.endTime}</span>
                    <span className="text-gray-600 col-span-2">📝 {form.purpose}</span>
                  </div>
                  <div className="text-teal-600 text-[11px] pt-1">✅ การจองของคุณจะได้รับการอนุมัติทันที</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          {step > 1 && <button type="button" className="btn-secondary" onClick={() => setStep(s => s - 1)}>← ย้อนกลับ</button>}
          {step < 3 && (
            <button type="button" className="btn-primary" onClick={() => {
              if (step === 1 && !validate1()) return;
              if (step === 2 && !validate2()) return;
              setStep(s => s + 1);
            }}>ถัดไป →</button>
          )}
          {step === 3 && (
            <button type="button" className="btn-primary btn-lg" onClick={submit} disabled={loading || !canSubmit}>
              {loading ? <><span className="loader" />&nbsp;กำลังส่ง...</> : '📨 ส่งคำขอจอง'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
