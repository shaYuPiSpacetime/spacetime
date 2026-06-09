import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'

import homeIcon from '@/assets/icons/tab-home.png'
import workIcon from '@/assets/icons/tab-work.png'
import recommendIcon from '@/assets/icons/tab-recommend.png'
import messageIcon from '@/assets/icons/tab-message.png'
import profileActiveIcon from '@/assets/icons/tab-profile-active.png'

export type TabKey = 'index' | 'community' | 'recommend' | 'chat' | 'profile'

interface Tab {
  key: TabKey
  label: string
  path: string
  icon: string
  activeIcon?: string
  iconWidth?: number
  iconHeight?: number
  activeIconWidth?: number
  activeIconHeight?: number
}

const TABS: Tab[] = [
  { key: 'index', label: '成家', path: '/pages/index/index', icon: homeIcon, activeIcon: homeIcon },
  { key: 'community', label: '立业', path: '/pages/community/index', icon: workIcon, activeIcon: workIcon },
  { key: 'recommend', label: '推荐', path: '/pages/recommend/index', icon: recommendIcon },
  { key: 'chat', label: '消息', path: '/pages/chat/index', icon: messageIcon, activeIcon: messageIcon },
  {
    key: 'profile',
    label: '我的',
    path: '/pages/profile/index',
    icon: profileActiveIcon,
    activeIcon: profileActiveIcon,
    iconWidth: 40,
    iconHeight: 35,
    activeIconWidth: 38,
    activeIconHeight: 36,
  },
]

interface Props {
  active: TabKey
}

/**
 * 底部 TabBar — 对齐蓝湖「我的」底部栏 750×166 坐标。
 */
export default function AppTabBar({ active }: Props) {
  const handlePress = (tab: Tab) => {
    if (tab.key === active) return
    Taro.switchTab({ url: tab.path })
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
        if (tab.key === 'recommend') {
          return (
            <View
              key={tab.key}
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
              <View
                style={{
                  width: '126rpx',
                  height: '126rpx',
                  borderRadius: '63rpx',
                  background: '#2876FF',
                  boxShadow: '0 4rpx 8rpx rgba(61,139,239,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image src={recommendIcon} style={{ width: '48rpx', height: '46rpx' }} mode="aspectFit" />
                <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>推荐</Text>
              </View>
            </View>
          )
        }

        const isOn = tab.key === active
        const icon = isOn && tab.activeIcon ? tab.activeIcon : tab.icon
        const iconWidth = isOn && tab.activeIconWidth ? tab.activeIconWidth : tab.iconWidth ?? 40
        const iconHeight = isOn && tab.activeIconHeight ? tab.activeIconHeight : tab.iconHeight ?? 35

        return (
          <View
            key={tab.key}
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
                width: '40rpx',
                height: '36rpx',
                marginBottom: '6rpx',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                src={icon}
                mode="aspectFit"
                style={{
                  width: `${iconWidth}rpx`,
                  height: `${iconHeight}rpx`,
                  opacity: isOn ? 1 : 0.55,
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
      <HitAreas onPress={handlePress} />
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

function HitAreas({ onPress }: { onPress: (tab: Tab) => void }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '0',
        right: '0',
        top: '0',
        height: '150rpx',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      {TABS.map((tab) => (
        <View
          key={tab.key}
          style={{
            flex: 1,
            height: '150rpx',
          }}
          onClick={() => onPress(tab)}
        />
      ))}
    </View>
  )
}
