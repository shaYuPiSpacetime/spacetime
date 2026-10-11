import { Image, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import tabEncounterIcon from '@/assets/icons/tab-encounter.png'
import tabEncounterActiveIcon from '@/assets/icons/tab-encounter-active.png'
import tabHomeIcon from '@/assets/icons/tab-home.png'
import tabHomeActiveIcon from '@/assets/icons/tab-home-active.png'
import tabWorkIcon from '@/assets/icons/tab-work.png'
import tabWorkActiveIcon from '@/assets/icons/tab-work-active.png'
import tabRecommendIcon from '@/assets/icons/tab-recommend.png'
import tabRecommendActiveIcon from '@/assets/icons/tab-recommend-active.png'
import tabMessageIcon from '@/assets/icons/tab-message.png'
import tabMessageActiveIcon from '@/assets/icons/tab-message-active.png'
import tabProfileIcon from '@/assets/icons/tab-profile.png'
import tabProfileActiveIcon from '@/assets/icons/tab-profile-active.png'
import type { NativeNavigationMetrics } from '@/components/NativeNavigation'
import NotificationBadge from '@/components/NotificationBadge'
import { formatMessageBadge } from '@/domain/messageRuntime'
import { useMessageRuntimeStore } from '@/stores/messageRuntimeStore'
import { useAuthStore } from '@/stores/authStore'
import { refreshRecommendBadge, useRecommendBadgeStore } from '@/stores/recommendBadgeStore'
import { setActiveTabKey } from '@/custom-tab-bar/tabState'

export type TabKey = 'kindred' | 'index' | 'community' | 'recommend' | 'chat' | 'profile'

interface Tab {
  key: TabKey
  label: string
  path: string
  iconPath: string
  activeIconPath: string
  iconWidth: number
  iconHeight: number
}

const TABS: Tab[] = [
  { key: 'kindred', label: '时空邂逅', path: '/pages/index/index', iconPath: tabEncounterIcon, activeIconPath: tabEncounterActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'index', label: '千寻', path: '/pages/index/index', iconPath: tabHomeIcon, activeIconPath: tabHomeActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'community', label: '心动', path: '/pages/community/index', iconPath: tabWorkIcon, activeIconPath: tabWorkActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'recommend', label: '推荐', path: '/pages/recommend/index', iconPath: tabRecommendIcon, activeIconPath: tabRecommendActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'chat', label: '消息', path: '/pages/chat/index', iconPath: tabMessageIcon, activeIconPath: tabMessageActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'profile', label: '我的', path: '/pages/profile/index', iconPath: tabProfileIcon, activeIconPath: tabProfileActiveIcon, iconWidth: 40, iconHeight: 40 },
]

let tabSwitchInFlight = false
let tabSwitchSourceRoute = ''
let tabSwitchGeneration = 0

export function releaseTabSwitch(expectedGeneration?: number) {
  if (expectedGeneration !== undefined && expectedGeneration !== tabSwitchGeneration) return
  tabSwitchInFlight = false
  tabSwitchSourceRoute = ''
}

function getCurrentRoute() {
  const pages = Taro.getCurrentPages()
  return pages.length > 0 ? pages[pages.length - 1]?.route ?? '' : ''
}

interface Props {
  active: TabKey
  onActiveChange?: (key: TabKey) => void
}

interface CapsuleLeftActionsOptions
  extends Pick<NativeNavigationMetrics, 'menuLeft' | 'menuTop' | 'menuHeight'> {
  actionCount: number
  actionSize?: number
  actionGap?: number
  capsuleGap?: number
  minLeft?: number
}

export function getCapsuleLeftActionsLayout({
  menuLeft,
  menuTop,
  menuHeight,
  actionCount,
  actionSize = 72,
  actionGap = 0,
  capsuleGap = 12,
  minLeft = 24,
}: CapsuleLeftActionsOptions) {
  const count = Math.max(1, actionCount)
  const width = count * actionSize + (count - 1) * actionGap

  return {
    left: Math.max(minLeft, menuLeft - capsuleGap - width),
    top: menuTop + (menuHeight - actionSize) / 2,
    width,
    actionSize,
    actionGap,
  }
}

/**
 * 底部六入口共用导航，图标与选中态使用蓝湖原始切图。
 */
export default function AppTabBar({ active, onActiveChange }: Props) {
  const userId = useAuthStore(state => state.userId)
  const loggedIn = useAuthStore(state => state.isLoggedIn)
  const badge = useRecommendBadgeStore()
  const refreshRecommendCount = () => {
    if (loggedIn) void refreshRecommendBadge(userId)
  }
  useEffect(() => {
    refreshRecommendCount()
  }, [loggedIn, userId])
  useDidShow(refreshRecommendCount)
  const visibleRecommendCount = loggedIn && badge.ownerId === userId ? badge.count : 0
  const messageUnreadCount = useMessageRuntimeStore(
    state => state.unreadSummary.messageUnreadCount,
  )
  const messageBadge = formatMessageBadge(messageUnreadCount)
  const updateActive = (key: TabKey) => {
    setActiveTabKey(key)
    onActiveChange?.(key)
  }
  const handlePress = (tab: Tab) => {
    const currentRoute = getCurrentRoute()
    // 等待页已经是推荐的当前状态，重选推荐入口不能先切回主路由再自动入栈。
    if (tab.key === 'recommend' && currentRoute === 'pages/prd08/recommend/waiting/index') return
    const sourceTab = TABS.find(item => item.path.slice(1) === currentRoute && item.key === active)
      ?? TABS.find(item => item.path.slice(1) === currentRoute)
    if (tabSwitchInFlight) {
      // 同一路由内的并发点击属于一次导航事务；路由已变化则说明上次切换已落地，
      // 即使微信 success 回调尚未送达，也不能吞掉用户在新页面上的下一次点击。
      if (!currentRoute || currentRoute === tabSwitchSourceRoute) return
      releaseTabSwitch()
    }
    // 是否重复点击只认微信真实路由，不能依赖可能滞后一帧的点亮状态。
    if (tab.path.slice(1) === currentRoute) {
      // 时空邂逅与千寻共用原生页面，通过共享点亮态切换内容，不重复导航。
      if (tab.key === 'kindred' || tab.key === 'index') updateActive(tab.key)
      if (tab.key === 'community') Taro.eventCenter.trigger('heartTabReselect')
      return
    }
    tabSwitchInFlight = true
    tabSwitchSourceRoute = currentRoute
    const generation = ++tabSwitchGeneration
    updateActive(tab.key)
    Taro.switchTab({
      url: tab.path,
      success: () => releaseTabSwitch(generation),
      fail: () => {
        if (generation !== tabSwitchGeneration) return
        updateActive(sourceTab?.key ?? active)
        releaseTabSwitch(generation)
      },
    })
  }

  return (
    <TabBarShell>
      <View
        style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '0',
          bottom: '0',
          background: '#FFFFFF',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '0',
          height: '1rpx',
          background: '#E3E9F0',
        }}
      />
      {TABS.map((tab, index) => {
        const isOn = tab.key === active
        return (
          <View
            key={tab.key}
            id={`app-tab-${tab.key}`}
            style={{
              position: 'absolute',
              left: `${index * 125}rpx`,
              top: '0',
              width: '125rpx',
              height: '100rpx',
              paddingTop: '18rpx',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
            onClick={() => handlePress(tab)}
          >
            <View
              style={{
                position: 'relative',
                width: '40rpx',
                height: '40rpx',
                marginBottom: '2rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                id={`app-tab-${tab.key}-icon`}
                src={tab.iconPath}
                mode="aspectFit"
                style={{
                  position: 'absolute',
                  width: `${tab.iconWidth}rpx`,
                  height: `${tab.iconHeight}rpx`,
                  opacity: isOn ? 0 : 1,
                }}
              />
              <Image
                src={tab.activeIconPath}
                mode="aspectFit"
                style={{ position: 'absolute', width: `${tab.iconWidth}rpx`, height: `${tab.iconHeight}rpx`, opacity: isOn ? 1 : 0 }}
              />
              {tab.key === 'recommend' ? (
                <NotificationBadge id="app-tab-recommend-badge" value={visibleRecommendCount} bordered
                  style={{ position: 'absolute', left: '27rpx', top: '-10rpx' }} />
              ) : null}
              {tab.key === 'chat' && messageBadge ? (
                <NotificationBadge
                  id="app-tab-message-unread"
                  value={messageBadge}
                  bordered
                  style={{ position: 'absolute', left: '27rpx', top: '-10rpx' }}
                />
              ) : null}
            </View>
            <View
              id={`app-tab-${tab.key}-label`}
              style={{
                color: isOn ? '#333333' : '#999999',
                fontSize: '20rpx',
                fontWeight: isOn ? 500 : 'normal',
                lineHeight: '28rpx',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </View>
          </View>
        )
      })}
    </TabBarShell>
  )
}

function TabBarShell({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 9999,
        width: '750rpx',
        height: 'calc(100rpx + env(safe-area-inset-bottom))',
        overflow: 'visible',
      }}
    >
      {children}
    </View>
  )
}
