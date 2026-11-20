import Taro from '@tarojs/taro'
import { useRef, useState } from 'react'

export interface ScrollRefresher {
  refresherEnabled: boolean
  refresherTriggered: boolean
  onRefresherRefresh: () => Promise<void>
}

/** 把微信下拉刷新交给当前可见的滚动容器，切换列表期间也只允许一次刷新。 */
export function useScrollRefresher(onRefresh: () => Promise<void>): ScrollRefresher | undefined {
  const [refreshing, setRefreshing] = useState(false)
  const inFlight = useRef(false)
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return undefined
  return {
    refresherEnabled: true,
    refresherTriggered: refreshing,
    async onRefresherRefresh() {
      if (inFlight.current) return
      inFlight.current = true
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        inFlight.current = false
        setRefreshing(false)
      }
    },
  }
}
