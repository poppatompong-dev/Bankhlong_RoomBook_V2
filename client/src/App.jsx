import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import DashboardSheets from './pages/DashboardSheets';
import AdminSheets from './pages/AdminSheets';

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<DashboardSheets />} />
        <Route path="/admin" element={<AdminSheets />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
