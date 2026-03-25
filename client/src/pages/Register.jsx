import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      background: 'linear-gradient(135deg, #f0faf4 0%, #f0fdf9 50%, #ffffff 100%)'
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 4px 15px rgba(20,184,166,0.3)' }}>
            🏢
          </div>
          <h1 className="font-prompt text-2xl font-bold text-gray-800">ลงทะเบียนใหม่</h1>
          <p className="text-gray-400 text-sm mt-1">สร้างบัญชีเพื่อใช้งานระบบจองห้องประชุม</p>
        </div>

        <div className="card">
          <div className="card-body">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ชื่อ-นามสกุล *</label>
                <input className="form-control" placeholder="กรอกชื่อ-นามสกุล" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">อีเมล *</label>
                <input type="email" className="form-control" placeholder="your@email.com" required
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">เบอร์โทรศัพท์</label>
                <input className="form-control" placeholder="0XX-XXX-XXXX"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">รหัสผ่าน *</label>
                <input type="password" className="form-control" placeholder="อย่างน้อย 6 ตัวอักษร" required minLength={6}
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><span className="loader"></span> กำลังลงทะเบียน...</> : '✅ ลงทะเบียน'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              มีบัญชีแล้ว? <Link to="/login" className="text-teal-500 font-semibold hover:text-teal-600">เข้าสู่ระบบ</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
