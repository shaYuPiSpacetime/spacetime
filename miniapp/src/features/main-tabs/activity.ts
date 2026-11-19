import { createContext, useContext, useLayoutEffect, useRef } from 'react'
import { useDidHide as useNativeHide, useDidShow as useNativeShow, useRouter as useNativeRouter } from '@tarojs/taro'

export const TabActivity = createContext<{ visible: boolean; isEntry: boolean } | null>(null)

export function useTabVisible() {
  return useContext(TabActivity)?.visible ?? true
}

/** 普通详情页遵循微信生命周期，底栏栏目只在自身真正显示或隐藏时收发事件。 */
export function useDidShow(callback: () => void) {
  const visible = useContext(TabActivity)?.visible
  const latest = useRef(callback)
  latest.current = callback
  useNativeShow(() => { if (visible === undefined) latest.current() })
  useLayoutEffect(() => { if (visible) latest.current() }, [visible])
}

export function useDidHide(callback: () => void) {
  const visible = useContext(TabActivity)?.visible
  const latest = useRef(callback)
  latest.current = callback
  useNativeHide(() => { if (visible === undefined) latest.current() })
  useLayoutEffect(() => {
    if (visible) return () => latest.current()
  }, [visible])
}

export function useRouter() {
  const activity = useContext(TabActivity)
  const router = useNativeRouter()
  // 经分享或调试链接传入的参数只属于该链接指向的栏目。
  return activity && !activity.isEntry ? { ...router, params: {} as typeof router.params } : router
}
