import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './guard';
import { AdminLayout } from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/login/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import { PlaceholderPage } from '@/pages/placeholder/PlaceholderPage';
import UserManagement from '@/pages/admin/UserManagement';
import RoleManagement from '@/pages/admin/RoleManagement';
import MenuManagement from '@/pages/admin/MenuManagement';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <AuthGuard>
            <AdminLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />

        {/* System Management */}
        <Route path="system/user" element={<UserManagement />} />
        <Route path="system/role" element={<RoleManagement />} />
        <Route path="system/menu" element={<MenuManagement />} />

        {/* Placeholder routes */}
        <Route path="match" element={<PlaceholderPage title="匹配" />} />
        <Route path="scale" element={<PlaceholderPage title="量表" />} />
        <Route path="matchmaking" element={<PlaceholderPage title="牵线台操作" />} />
        <Route path="tags" element={<PlaceholderPage title="画像标签" />} />
        <Route path="match-rules" element={<PlaceholderPage title="匹配规则" />} />
        <Route path="users" element={<PlaceholderPage title="用户管理" />} />
        <Route path="coins" element={<PlaceholderPage title="千寻币" />} />
        <Route path="checkin" element={<PlaceholderPage title="签到" />} />
        <Route path="products" element={<PlaceholderPage title="商品" />} />
        <Route path="services" element={<PlaceholderPage title="服务" />} />
        <Route path="operations" element={<PlaceholderPage title="运营" />} />
        <Route path="system" element={<PlaceholderPage title="系统" />} />
        <Route path="support" element={<PlaceholderPage title="客服" />} />
        <Route path="finance" element={<PlaceholderPage title="财务" />} />
        <Route path="data" element={<PlaceholderPage title="数据" />} />
        <Route path="content" element={<PlaceholderPage title="内容" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
