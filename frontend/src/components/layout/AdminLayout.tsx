import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/authStore';

export function AdminLayout() {
  const token = useAuthStore((state) => state.token);
  const refreshPermissions = useAuthStore((state) => state.refreshPermissions);

  useEffect(() => {
    if (token) void refreshPermissions().catch(() => {});
  }, [refreshPermissions, token]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pl-sidebar pt-header">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
