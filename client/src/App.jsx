import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ToastProvider } from './contexts/ToastContext';
import Header from './components/layout/Header';
import BookingTicker from './components/layout/BookingTicker';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Bookings from './pages/Bookings';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Help from './pages/Help';

const PrivateRoute = ({ children, requireAdmin }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="p-10 text-center flex justify-center"><div className="loader"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const MainLayout = ({ children }) => (
  <>
    <Header />
    <BookingTicker />
    <main className="flex-1 w-full bg-slate-50 relative">
      {children}
    </main>
  </>
);

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col font-prompt">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/help" element={<Help />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/bookings" element={
                <PrivateRoute><MainLayout><Bookings /></MainLayout></PrivateRoute>
              } />
              <Route path="/analytics" element={
                <PrivateRoute><MainLayout><Analytics /></MainLayout></PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute><MainLayout><Settings /></MainLayout></PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute requireAdmin={true}><MainLayout><Admin /></MainLayout></PrivateRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
