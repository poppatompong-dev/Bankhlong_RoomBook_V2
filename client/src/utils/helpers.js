export const API_URL = '/api';

export const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const TIME_SLOTS = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

export function formatDateTH(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function timeDiff(s, e) {
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getStatusBadge(status) {
  switch (status) {
    case 'approved': return { cls: 'badge-success', label: '✅ อนุมัติ' };
    case 'cancelled': return { cls: 'badge-danger', label: '❌ ยกเลิก' };
    default: return { cls: 'badge-info', label: status };
  }
}
