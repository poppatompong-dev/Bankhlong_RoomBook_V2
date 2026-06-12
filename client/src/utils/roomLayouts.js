export const DEFAULT_ROOM_LAYOUTS = [
  { id: 'classroom', label: 'ห้องเรียน (Classroom)', icon: '🎓', sortOrder: 10, isActive: true },
  { id: 'conference', label: 'ประชุมกลุ่ม (Conference)', icon: '🪑', sortOrder: 20, isActive: true },
  { id: 'ushape', label: 'ยู-เชฟ (U-Shape)', icon: '🔵', sortOrder: 30, isActive: true },
  { id: 'theater', label: 'เธียเตอร์ (Theater)', icon: '🎭', sortOrder: 40, isActive: true },
  { id: 'banquet', label: 'แบงควิต (Banquet)', icon: '🍽️', sortOrder: 50, isActive: true },
  { id: 'other', label: 'อื่นๆ (ระบุ)', icon: '📐', sortOrder: 60, isActive: true }
];

export function normalizeRoomLayouts(layouts = DEFAULT_ROOM_LAYOUTS) {
  const source = Array.isArray(layouts) ? layouts : DEFAULT_ROOM_LAYOUTS;
  return source
    .map(layout => ({
      ...layout,
      id: layout.id || layout._id,
      _id: layout._id || layout.id,
      label: layout.label || '',
      icon: layout.icon || '▦',
      sortOrder: Number(layout.sortOrder ?? 0),
      isActive: layout.isActive !== false
    }))
    .filter(layout => layout.id && layout.label)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function formatRoomLayout(layout) {
  if (!layout) return '-';
  return `${layout.icon || '▦'} ${layout.label}`;
}
