import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.me()
        .then(res => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (loginInput, password) => {
    const res = await authAPI.login({ login: loginInput, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    showToast(`ยินดีต้อนรับ ${userData.name}`, 'success');
    return userData;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token, user: userData } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    showToast('ลงทะเบียนสำเร็จ', 'success');
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    showToast('ออกจากระบบแล้ว', 'info');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
