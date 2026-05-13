import { Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { AdminTopTabs } from './AdminTopTabs';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="fixed left-sidebar right-0 top-0 z-30 flex h-header items-center justify-between gap-6 border-b border-border bg-header px-6">
      <AdminTopTabs />

      <div className="flex shrink-0 items-center gap-4">
        <button className="relative rounded-md p-1.5 transition-colors hover:bg-muted">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-2">
          <Avatar className="h-[29px] w-[29px]" fallback={user?.nickname?.[0] ?? '管'} />
          <span className="text-sm text-foreground">{user?.nickname ?? '系统管理员'}</span>
        </div>

        <button
          onClick={logout}
          className="ml-2 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          退出
        </button>
      </div>
    </header>
  );
}
