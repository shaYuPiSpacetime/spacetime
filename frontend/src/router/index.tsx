import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './guard';
import LoginPage from '@/pages/login/LoginPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <div>欢迎使用 Spacetime 管理后台</div>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
