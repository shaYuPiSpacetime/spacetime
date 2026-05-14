import type { RouterVO } from '@/api/menu';

export function getAdminMenuTree(menuTree: RouterVO[]) {
  return menuTree;
}

export function sortMenuItems(items: RouterVO[]) {
  return [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

