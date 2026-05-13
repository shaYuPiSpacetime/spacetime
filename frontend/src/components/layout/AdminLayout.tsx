import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pl-sidebar pt-header">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
