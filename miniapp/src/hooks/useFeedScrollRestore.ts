import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'

interface FeedScrollEvent {
  detail: { scrollTop: number }
}

/**
 * 信息流滚动位置保持：操作面板（弹层）打开/关闭会触发页面内容重渲染，
 * 渲染层会将 ScrollView 弹回顶部。本 hook 在面板完全关闭后，用受控
 * scrollTop 恢复面板出现前的位置。
 *
 * 用法：
 *   const { scrollTop, onScroll, skipNextRestore } = useFeedScrollRestore(
 *     sheet !== null || whisperTarget !== null,
 *   )
 *   <ScrollView scrollY scrollTop={scrollTop} onScroll={onScroll} ...>
 *
 * 面板激活状态通过 hasOpenSheet 传入；任一弹层非空即视为打开。
 * 业务主动要求回顶（如删除动态）时调用 skipNextRestore() 跳过本次恢复。
 */
export function useFeedScrollRestore(hasOpenSheet: boolean) {
  const scrollTopRef = useRef(0)
  const openedSheetRef = useRef(false)
  const skipRestoreRef = useRef(false)
  const [restoredScrollTop, setRestoredScrollTop] = useState<number>()

  useEffect(() => {
    if (hasOpenSheet) {
      openedSheetRef.current = true
      return
    }
    if (!openedSheetRef.current) return
    openedSheetRef.current = false
    if (skipRestoreRef.current) {
      skipRestoreRef.current = false
      return
    }
    const preserved = Math.max(0, scrollTopRef.current)
    // 先解除受控值，下一帧再设置，确保渲染层真正执行滚动恢复。
    setRestoredScrollTop(undefined)
    let cancelled = false
    void Taro.nextTick(() => {
      if (!cancelled) setRestoredScrollTop(preserved)
    })
    return () => {
      cancelled = true
    }
  }, [hasOpenSheet])

  return {
    scrollTop: restoredScrollTop,
    onScroll: (event: FeedScrollEvent) => {
      scrollTopRef.current = event.detail.scrollTop
    },
    skipNextRestore: () => {
      skipRestoreRef.current = true
    },
    resetToTop: () => {
      openedSheetRef.current = false
      skipRestoreRef.current = false
      setRestoredScrollTop(undefined)
      void Taro.nextTick(() => setRestoredScrollTop(0))
    },
  }
}
