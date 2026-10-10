import { useDidHide, useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import { subscribeCommunityPersonalChanged } from '@/domain/communityPersonalEvents'
import { getCommunityProfileSummary, type CommunityProfileSummaryVO } from '@/services/community'
import { useAuthStore } from '@/stores/authStore'

/** 只缓存最近一次本人统计供页面切换展示；每次进入和写操作后均重新查询。 */
let cached: { userId: number; summary: CommunityProfileSummaryVO } | undefined

/** 个人资料和数字独立加载；只在页面可见时每 15 秒核对外部互动变化。 */
export function useCommunityPersonalSummary() {
  const userId = useAuthStore(state => state.userId)
  const [snapshot, setSnapshot] = useState<typeof cached>(() =>
    cached?.userId === userId ? cached : undefined)
  const visible = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval>>()
  const running = useRef(false)
  const revision = useRef(0)
  const disposed = useRef(false)

  const refresh = async (invalidate = false) => {
    if (invalidate) revision.current++
    let ownerId = useAuthStore.getState().userId
    if (running.current || !visible.current || !ownerId) return
    running.current = true
    try {
      do {
        ownerId = useAuthStore.getState().userId
        if (!ownerId) break
        const requestRevision = revision.current
        try {
          const next = await getCommunityProfileSummary()
          // 写操作发生后不展示操作前的迟到响应；下一轮立即重新核对。
          if (!disposed.current && visible.current && useAuthStore.getState().userId === ownerId
              && requestRevision === revision.current) {
            cached = { userId: ownerId, summary: next }
            setSnapshot(cached)
          }
        } catch {
          // 短暂网络失败保留最后一次成功数据，下一次进入/定时刷新自动恢复。
        }
        if (requestRevision === revision.current) break
      } while (!disposed.current && visible.current)
    } finally {
      running.current = false
    }
  }

  useDidShow(() => {
    visible.current = true
    void refresh(true)
    clearInterval(timer.current)
    timer.current = setInterval(() => { void refresh() }, 15000)
  })
  useDidHide(() => {
    visible.current = false
    clearInterval(timer.current)
  })
  useEffect(() => {
    setSnapshot(cached?.userId === userId ? cached : undefined)
    void refresh(true)
    return subscribeCommunityPersonalChanged(() => { void refresh(true) })
  }, [userId])
  useEffect(() => {
    disposed.current = false
    return () => {
      disposed.current = true
      clearInterval(timer.current)
    }
  }, [])

  return { summary: snapshot?.userId === userId ? snapshot?.summary : undefined, refreshSummary: refresh }
}
