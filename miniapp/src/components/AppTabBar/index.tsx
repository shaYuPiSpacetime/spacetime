import { Image, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import tabHomeIcon from '@/assets/icons/tab-home.png'
import tabHomeActiveIcon from '@/assets/icons/tab-home-active.png'
import tabWorkIcon from '@/assets/icons/tab-work.png'
import tabWorkActiveIcon from '@/assets/icons/tab-work-active.png'
import tabRecommendIcon from '@/assets/icons/tab-recommend.png'
import tabMessageIcon from '@/assets/icons/tab-message.png'
import tabMessageActiveIcon from '@/assets/icons/tab-message-active.png'
import tabProfileIcon from '@/assets/icons/tab-profile.png'
import tabProfileActiveIcon from '@/assets/icons/tab-profile-active.png'

export type TabKey = 'index' | 'community' | 'recommend' | 'chat' | 'profile'

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
  { key: 'index', label: '千寻', path: '/pages/index/index', iconPath: tabHomeIcon, activeIconPath: tabHomeActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'community', label: '心动', path: '/pages/community/index', iconPath: tabWorkIcon, activeIconPath: tabWorkActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'recommend', label: '推荐', path: '/pages/recommend/index', iconPath: tabRecommendIcon, activeIconPath: tabRecommendIcon, iconWidth: 126, iconHeight: 126 },
  { key: 'chat', label: '消息', path: '/pages/chat/index', iconPath: tabMessageIcon, activeIconPath: tabMessageActiveIcon, iconWidth: 40, iconHeight: 40 },
  { key: 'profile', label: '我的', path: '/pages/profile/index', iconPath: tabProfileIcon, activeIconPath: tabProfileActiveIcon, iconWidth: 40, iconHeight: 40 },
]

let tabSwitchInFlight = false
let tabSwitchSourceRoute = ''

export function releaseTabSwitch() {
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

/**
 * 底部 TabBar — 对齐蓝湖「我的」底部栏 750×166 坐标。
 */
export default function AppTabBar({ active, onActiveChange }: Props) {
  const handlePress = (tab: Tab) => {
    const currentRoute = getCurrentRoute()
    const sourceTab = TABS.find(item => item.path.slice(1) === currentRoute)
    if (tabSwitchInFlight) {
      // 同一路由内的并发点击属于一次导航事务；路由已变化则说明上次切换已落地，
      // 即使微信 success 回调尚未送达，也不能吞掉用户在新页面上的下一次点击。
      if (!currentRoute || currentRoute === tabSwitchSourceRoute) return
      releaseTabSwitch()
    }
    // 是否重复点击只认微信真实路由，不能依赖可能滞后一帧的点亮状态。
    if (tab.path.slice(1) === currentRoute) return
    tabSwitchInFlight = true
    tabSwitchSourceRoute = currentRoute
    onActiveChange?.(tab.key)
    Taro.switchTab({
      url: tab.path,
      success: releaseTabSwitch,
      fail: () => {
        onActiveChange?.(sourceTab?.key ?? active)
        releaseTabSwitch()
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
          top: '22rpx',
          bottom: '0',
          background: '#FFFFFF',
          boxShadow: '0 -4rpx 16rpx rgba(222, 229, 238, 0.65)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '-8rpx',
          right: '-8rpx',
          top: '22rpx',
          height: '1rpx',
          background: '#E3E9F0',
        }}
      />
      <View
        id="app-tab-recommend-outer-arc"
        style={{
          position: 'absolute',
          left: '300rpx',
          top: '0',
          width: '150rpx',
          height: '150rpx',
          borderRadius: '75rpx',
          background: '#FFFFFF',
          boxShadow: '0 -4rpx 16rpx rgba(222, 229, 238, 0.65)',
        }}
      />
      {TABS.map((tab, index) => {
        const isOn = tab.key === active
        if (tab.key === 'recommend') {
          return (
            <View
              key={tab.key}
              id={`app-tab-${tab.key}`}
              style={{
                position: 'absolute',
                left: '300rpx',
                top: '0',
                width: '150rpx',
                height: '150rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => handlePress(tab)}
            >
              <Image
                id="app-tab-recommend-blue-circle"
                src={tab.iconPath}
                mode="aspectFit"
                style={{
                  position: 'absolute',
                  left: '12rpx',
                  top: '12rpx',
                  width: `${tab.iconWidth}rpx`,
                  height: `${tab.iconHeight}rpx`,
                }}
              />
              <Text
                id="app-tab-recommend-label"
                style={{
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  top: '84rpx',
                  color: '#FFFFFF',
                  fontSize: '20rpx',
                  lineHeight: '28rpx',
                  textAlign: 'center',
                }}
              >
                推荐
              </Text>
            </View>
          )
        }

        return (
          <View
            key={tab.key}
            id={`app-tab-${tab.key}`}
            style={{
              position: 'absolute',
              left: `${index * 150}rpx`,
              top: '44rpx',
              width: '150rpx',
              height: '82rpx',
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
                style={{
                  position: 'absolute',
                  width: `${tab.iconWidth}rpx`,
                  height: `${tab.iconHeight}rpx`,
                  opacity: isOn ? 1 : 0,
                }}
              />
            </View>
            <Text
              style={{
                color: isOn ? '#333333' : '#999999',
                fontSize: '20rpx',
                fontWeight: isOn ? 500 : 'normal',
                lineHeight: '28rpx',
              }}
            >
              {tab.label}
            </Text>
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
        height: '166rpx',
        overflow: 'visible',
      }}
    >
      {children}
    </View>
  )
}
