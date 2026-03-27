import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
  const [form, setForm] = useState({ login: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.login, form.password);
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
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img
              src="https://img2.pic.in.th/S__76685340.png"
              alt="logo"
              className="h-20 w-20 object-contain rounded-2xl"
              style={{ boxShadow: '0 4px 15px rgba(20,184,166,0.2)' }}
            />
          </div>
          <h1 className="font-prompt text-2xl font-bold text-gray-800">Smart Meeting Room</h1>
          <p className="text-gray-400 text-sm mt-1">ระบบจองห้องประชุมอัจฉริยะ</p>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="font-prompt text-lg font-semibold text-gray-800 mb-6 text-center">เข้าสู่ระบบ</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                ❌ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">ชื่อผู้ใช้ / อีเมล</label>
                <input type="text" className="form-control" placeholder="admin หรือ your@email.com" required
                  value={form.login} onChange={e => setForm({...form, login: e.target.value})} />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">รหัสผ่าน</label>
                <input type="password" className="form-control" placeholder="••••••" required
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><span className="loader"></span> กำลังเข้าสู่ระบบ...</> : '🔐 เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              ยังไม่มีบัญชี? <Link to="/register" className="text-teal-500 font-semibold hover:text-teal-600">ลงทะเบียน</Link>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              <p className="font-semibold mb-1">🔑 บัญชีทดสอบ:</p>
              <p>Admin: admin / admin123</p>
              <p>User: user@meeting.com / user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

