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
import DictTypeManagement from '@/pages/admin/DictTypeManagement';
import DictDataManagement from '@/pages/admin/DictDataManagement';
import PromotionManagement from '@/pages/promotion/PromotionManagement';
import ContentArticlePage from '@/pages/content/ContentArticlePage';
import AppConfigPage from '@/pages/content/AppConfigPage';
import MobileEntryConfigPage from '@/pages/content/MobileEntryConfigPage';
import SearchHotWordPage from '@/pages/content/SearchHotWordPage';
import SearchBlockWordPage from '@/pages/content/SearchBlockWordPage';
import ContentOperationLogPage from '@/pages/content/ContentOperationLogPage';
import CommunityManagementPage from '@/pages/community/CommunityManagementPage';
import FeedbackPage from '@/pages/user-security/FeedbackPage';
import CancelRequestPage from '@/pages/user-security/CancelRequestPage';
import FinanceManagement from '@/pages/finance/FinanceManagement';
import VipBenefitManagement from '@/pages/config/VipBenefitManagement';
import VipPackageManagement from '@/pages/config/VipPackageManagement';
import CoinPackageManagement from '@/pages/config/CoinPackageManagement';

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
        <Route path="system/dict-type" element={<DictTypeManagement />} />
        <Route path="system/dict-data" element={<DictDataManagement />} />

        {/* Promotion */}
        <Route path="promotion/rules" element={<PromotionManagement />} />
        <Route path="promotion/invites" element={<PromotionManagement />} />
        <Route path="promotion/rewards" element={<PromotionManagement />} />
        <Route path="promotion/agents" element={<PromotionManagement />} />
        <Route path="promotion/settlements" element={<PromotionManagement />} />

        {/* Content Management */}
        <Route path="content/articles" element={<ContentArticlePage />} />
        <Route path="content/app-config" element={<AppConfigPage />} />
        <Route path="content/mobile-entries" element={<MobileEntryConfigPage />} />
        <Route path="content/search-hot-words" element={<SearchHotWordPage />} />
        <Route path="content/search-block-words" element={<SearchBlockWordPage />} />
        <Route path="content/operation-logs" element={<ContentOperationLogPage />} />

        {/* Community Management */}
        <Route path="community/posts" element={<CommunityManagementPage />} />
        <Route path="community/comments" element={<CommunityManagementPage />} />
        <Route path="community/reports" element={<CommunityManagementPage />} />
        <Route path="community/configs" element={<CommunityManagementPage />} />

        {/* User Security */}
        <Route path="user-security/feedback" element={<FeedbackPage />} />
        <Route path="user-security/cancel-requests" element={<CancelRequestPage />} />

        {/* Finance Center */}
        <Route path="finance/orders" element={<FinanceManagement />} />
        <Route path="finance/flows" element={<FinanceManagement />} />
        <Route path="finance/refunds" element={<FinanceManagement />} />

        {/* Commercial Config */}
        <Route path="config/vip-benefits" element={<VipBenefitManagement />} />
        <Route path="config/vip-packages" element={<VipPackageManagement />} />
        <Route path="config/coin-packages" element={<CoinPackageManagement />} />

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
        <Route path="data" element={<PlaceholderPage title="数据" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
