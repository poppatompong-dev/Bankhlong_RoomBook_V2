const DEFAULT_ROOM_LAYOUTS = [
  { id: 'classroom', label: 'ห้องเรียน (Classroom)', icon: '🎓', sortOrder: 10, isActive: true },
  { id: 'conference', label: 'ประชุมกลุ่ม (Conference)', icon: '🪑', sortOrder: 20, isActive: true },
  { id: 'ushape', label: 'ยู-เชฟ (U-Shape)', icon: '🔵', sortOrder: 30, isActive: true },
  { id: 'theater', label: 'เธียเตอร์ (Theater)', icon: '🎭', sortOrder: 40, isActive: true },
  { id: 'banquet', label: 'แบงควิต (Banquet)', icon: '🍽️', sortOrder: 50, isActive: true },
  { id: 'other', label: 'อื่นๆ (ระบุ)', icon: '📐', sortOrder: 60, isActive: true }
];

module.exports = { DEFAULT_ROOM_LAYOUTS };
