import { useDidHide, useDidShow } from '@tarojs/taro'
import { useCallback, useEffect, useRef, useState } from 'react'
import { prd01Api } from '@/services/prd01'
import type { BasicProfile } from '@/types/prd01'

function normalizeScore(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : undefined
}

/** Keep the server score fresh without reloading the editor's fields or drafts. */
export function useProfileScore(initialScore: unknown) {
  const [profileScore, setProfileScore] = useState(() => normalizeScore(initialScore) ?? 0)
  const mounted = useRef(true)
  const requestId = useRef(0)
  const pending = useRef<Promise<BasicProfile>>()

  const invalidate = useCallback(() => {
    requestId.current += 1
    pending.current = undefined
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      invalidate()
    }
  }, [invalidate])

  const loadBasicProfile = useCallback((force = false): Promise<BasicProfile> => {
    if (!force && pending.current) return pending.current
    const id = ++requestId.current
    const request = prd01Api.getBasicProfile().then(profile => {
      const score = normalizeScore(profile.profileScore)
      if (mounted.current && id === requestId.current && score !== undefined) {
        setProfileScore(score)
      }
      return profile
    }).finally(() => {
      if (pending.current === request) pending.current = undefined
    })
    pending.current = request
    return request
  }, [])

  // A successful save must not reuse a read started before that save.
  // Refresh failures preserve the last known score and do not turn a successful save into an error.
  const refreshProfileScore = useCallback(async () => {
    try {
      await loadBasicProfile(true)
    } catch {
      // The next page show or successful save retries the server read.
    }
  }, [loadBasicProfile])

  useDidShow(() => { void loadBasicProfile().catch(() => {}) })
  useDidHide(invalidate)

  return { profileScore, loadBasicProfile, refreshProfileScore }
}
