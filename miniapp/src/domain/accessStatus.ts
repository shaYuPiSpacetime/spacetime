import type { AccessStatus } from '@/types/prd01'

export function isAccountRestricted(status?: AccessStatus | null): boolean {
  return status?.accountStatus === 'FROZEN' || status?.accountStatus === 'CANCELLED'
}
