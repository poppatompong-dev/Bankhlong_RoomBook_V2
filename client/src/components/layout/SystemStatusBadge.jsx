import { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_CONFIG = {
  checking: {
    dot: 'bg-amber-200',
    label: 'Checking',
    title: 'กำลังตรวจสอบสถานะระบบ'
  },
  online: {
    dot: 'bg-green-300 animate-pulse',
    label: 'Online',
    title: 'ระบบ API พร้อมใช้งาน'
  },
  offline: {
    dot: 'bg-red-400',
    label: 'Offline',
    title: 'ไม่สามารถเชื่อมต่อ API ได้ในขณะนี้'
  }
};

export default function SystemStatusBadge({ className = '', showLabel = true }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const res = await api.get('/health', { timeout: 5000 });
        const isHealthy = res.data?.ok === true && res.data?.status === 'healthy';
        if (mounted) setStatus(isHealthy ? 'online' : 'offline');
      } catch {
        if (mounted) setStatus('offline');
      }
    };

    checkHealth();
    const interval = window.setInterval(checkHealth, 60000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const cfg = STATUS_CONFIG[status];

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      title={cfg.title}
      aria-label={`สถานะระบบ: ${cfg.label}`}
    >
      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {showLabel && <span className="text-xs opacity-90">{cfg.label}</span>}
    </div>
  );
}
