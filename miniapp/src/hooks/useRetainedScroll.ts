import { useRef, useState } from 'react'
import { useDidShow } from '@tarojs/taro'

/** 页面实例内按列表分类保存像素偏移，不写全局缓存；滚动时不触发 React 重绘。 */
export function useRetainedScroll(key: string) {
  const offsets = useRef(new Map<string, number>())
  const [, render] = useState(0)
  useDidShow(() => render(value => value + 1))
  return {
    scrollTop: offsets.current.get(key) || 0,
    onScroll: (event: { detail: { scrollTop: number } }) => {
      offsets.current.set(key, Math.max(0, event.detail.scrollTop))
    },
    reset: (targetKey = key) => {
      offsets.current.set(targetKey, 0)
      render(value => value + 1)
    },
  }
}
