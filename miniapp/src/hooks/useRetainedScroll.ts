import { useRef, useState } from 'react'
import { useDidHide, useDidShow } from '@tarojs/taro'

/** 页面实例内按列表分类保存像素偏移，不写全局缓存；滚动时不触发 React 重绘。 */
export function useRetainedScroll(key: string, initialOffset = 0) {
  const offsets = useRef(new Map<string, number>([[key, initialOffset]]))
  const visible = useRef(true)
  const [, render] = useState(0)
  useDidShow(() => { visible.current = true; render(value => value + 1) })
  useDidHide(() => { visible.current = false })
  return {
    scrollTop: offsets.current.get(key) || 0,
    onScroll: (event: { detail: { scrollTop: number } }) => {
      if (visible.current) offsets.current.set(key, Math.max(0, event.detail.scrollTop))
    },
    getScrollTop: () => offsets.current.get(key) || 0,
    reset: (targetKey = key) => {
      offsets.current.set(targetKey, 0)
      render(value => value + 1)
    },
  }
}
