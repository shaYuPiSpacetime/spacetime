import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { prd01Api } from '@/services/prd01'
import { useAuthStore } from '@/stores/authStore'
import type { AccessStatus } from '@/types/prd01'

export type AccessCapability = 'canBrowseCards' | 'canMatch' | 'canMessage' | 'canCommunity' | 'canBeExposed'

export function useAccessStatus(capability: AccessCapability) {
  const cached = useAuthStore(state => state.accessStatus)
  const setAccessStatus = useAuthStore(state => state.setAccessStatus)
  const [status, setStatus] = useState<AccessStatus | null>(cached)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const next = await prd01Api.getAccessStatus()
      setStatus(next)
      setAccessStatus(next)
      return next
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      return undefined
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => { void refresh() })

  return {
    status,
    loading,
    error,
    allowed: status?.[capability],
    blockReasons: status?.blockReasons || [],
    refresh,
  }
}
