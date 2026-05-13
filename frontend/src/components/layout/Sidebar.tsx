import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  ClipboardList,
  Users,
  UserCheck,
  Tags,
  GitBranch,
  Coins,
  CalendarCheck,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Settings,
  HeadphonesIcon,
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  Menu,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuStore } from '@/stores/menuStore';
import type { RouterVO } from '@/api/menu';
import { getAdminMenuTree, sortMenuItems } from './adminNavigation';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Heart,
  ClipboardList,
  Users,
  UserCheck,
  Tags,
  GitBranch,
  Coins,
  CalendarCheck,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Settings,
  HeadphonesIcon,
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  Menu,
  Lock,
};

function getIcon(name?: string): LucideIcon {
  return name ? iconMap[name] || Settings : Settings;
}

function isItemActive(pathname: string, item: RouterVO) {
  return pathname === item.path || pathname.startsWith(item.path + '/');
}

function hasActiveChild(pathname: string, item: RouterVO): boolean {
  return isItemActive(pathname, item) || item.children?.some((child) => hasActiveChild(pathname, child));
}

function SidebarMenuItem({ item, level = 0 }: { item: RouterVO; level?: number }) {
  const location = useLocation();
  const isActive = isItemActive(location.pathname, item);
  const childActive = hasActiveChild(location.pathname, item);
  const Icon = getIcon(item.meta.icon);
  const children = sortMenuItems(item.children ?? []);
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState<boolean>(childActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            'relative flex h-10 w-full items-center gap-3 px-4 text-left text-[13px] transition-colors',
            childActive
              ? 'text-sidebar-active font-medium'
              : 'text-sidebar-foreground hover:text-sidebar-active',
          )}
        >
          {childActive && (
            <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-active" />
          )}
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="min-w-0 flex-1 truncate">{item.meta.title}</span>
          <span
            className={cn(
              'h-1.5 w-1.5 rotate-45 border-r border-b border-current transition-transform',
              expanded && 'rotate-[225deg]',
            )}
          />
        </button>
        {expanded && (
          <div className="pb-1">
            {children.map((child) => (
              <SidebarMenuItem key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      className={cn(
        'relative flex h-10 items-center gap-3 px-4 text-[13px] transition-colors',
        isActive
          ? 'text-sidebar-active font-medium'
          : 'text-sidebar-foreground hover:text-sidebar-active',
      )}
      style={{ paddingLeft: `${16 + level * 18}px` }}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-active" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate">{item.meta.title}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const menuTree = useMenuStore((s) => s.menuTree);
  const fetchRouters = useMenuStore((s) => s.fetchRouters);
  const visibleMenuTree = useMemo(() => sortMenuItems(getAdminMenuTree(menuTree)), [menuTree]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) fetchRouters();
  }, []);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-sidebar flex-col overflow-y-auto border-r border-border bg-sidebar">
      <div className="flex h-header shrink-0 items-center gap-2 px-4">
        <span className="text-[20px] font-bold text-sidebar-active">时空邂逅</span>
      </div>

      <nav className="flex-1 space-y-4 py-3">
        {visibleMenuTree.map((section) => (
          <div key={section.id}>
            <div className="px-4 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              {section.meta.title}
            </div>
            <div className="space-y-0.5">
              {sortMenuItems(section.children ?? []).map((item) => (
                <SidebarMenuItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4 text-[11px] text-muted-foreground/50">
        Spacetime Admin v1.0
      </div>
    </aside>
  );
}
