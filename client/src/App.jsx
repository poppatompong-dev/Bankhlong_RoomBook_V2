import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import DashboardSheets from './pages/DashboardSheets';
import AdminSheets from './pages/AdminSheets';
import Help from './pages/Help';

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<DashboardSheets />} />
        <Route path="/admin" element={<AdminSheets />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
