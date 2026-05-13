import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMenuStore } from '@/stores/menuStore';
import type { RouterVO } from '@/api/menu';
import { getAdminMenuTree, sortMenuItems } from './adminNavigation';

function isRouteMatch(pathname: string, item: RouterVO) {
  return pathname === item.path || pathname.startsWith(item.path + '/');
}

function findActiveSection(items: RouterVO[], pathname: string): RouterVO | undefined {
  for (const item of items) {
    if (isRouteMatch(pathname, item)) return item;
    if (item.children?.some((child) => isRouteMatch(pathname, child))) return item;
    const nested = findActiveSection(item.children ?? [], pathname);
    if (nested) return item.children?.includes(nested) ? item : nested;
  }
}

function findActiveLeaf(items: RouterVO[], pathname: string): RouterVO | undefined {
  for (const item of items) {
    if (isRouteMatch(pathname, item)) return item;
    const child = findActiveLeaf(item.children ?? [], pathname);
    if (child) return child;
  }
}

export function AdminTopTabs() {
  const location = useLocation();
  const menuTree = useMenuStore((s) => s.menuTree);
  const visibleMenuTree = sortMenuItems(getAdminMenuTree(menuTree));
  const activeSection = findActiveSection(visibleMenuTree, location.pathname);
  const activeLeaf = findActiveLeaf(visibleMenuTree, location.pathname);
  const tabItems = sortMenuItems(activeSection?.children ?? []);

  if (!activeSection || tabItems.length <= 1) {
    return (
      <div className="min-w-0">
        <div className="text-[16px] font-semibold leading-6 text-foreground">
          {activeLeaf?.meta.title ?? activeSection?.meta.title ?? '首页概览'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="shrink-0 text-[16px] font-semibold leading-6 text-foreground">
        {activeSection.meta.title}
      </div>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {tabItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'relative flex h-header items-center whitespace-nowrap px-3 text-[14px] text-muted-foreground transition-colors',
                (isActive || isRouteMatch(location.pathname, item)) &&
                  'font-medium text-sidebar-active',
              )
            }
          >
            {item.meta.title}
            {isRouteMatch(location.pathname, item) && (
              <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-sidebar-active" />
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

