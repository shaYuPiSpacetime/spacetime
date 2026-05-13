import { useAuthStore } from '@/stores/authStore';

export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  const hasPermission = (perm: string) => permissions.includes(perm);

  const hasAnyPermission = (...perms: string[]) =>
    perms.some((p) => permissions.includes(p));

  const hasAllPermissions = (...perms: string[]) =>
    perms.every((p) => permissions.includes(p));

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
