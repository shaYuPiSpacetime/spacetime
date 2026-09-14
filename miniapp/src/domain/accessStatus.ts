import type { AccessStatus } from '@/types/prd01'

export function isAccountRestricted(status?: AccessStatus | null): boolean {
  return status?.accountStatus === 'FROZEN' || status?.accountStatus === 'CANCELLED'
}

/** 核心准入失败（含年龄不在配置范围）时禁止进入业务首页。 */
export function isCoreAccessBlocked(status?: AccessStatus | null): boolean {
  return status?.coreAccessStatus === 'CORE_BLOCKED'
}
