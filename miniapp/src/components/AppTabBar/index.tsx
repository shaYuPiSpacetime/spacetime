import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'

export type TabKey = 'index' | 'community' | 'recommend' | 'chat' | 'profile'
type TabIconType = 'home' | 'heart' | 'star' | 'message' | 'profile'

interface Tab {
  key: TabKey
  label: string
  path: string
  icon: TabIconType
}

const TABS: Tab[] = [
  { key: 'index', label: '千寻', path: '/pages/index/index', icon: 'home' },
  { key: 'community', label: '心动', path: '/pages/community/index', icon: 'heart' },
  { key: 'recommend', label: '推荐', path: '/pages/recommend/index', icon: 'star' },
  { key: 'chat', label: '消息', path: '/pages/chat/index', icon: 'message' },
  { key: 'profile', label: '我的', path: '/pages/profile/index', icon: 'profile' },
]

const TAB_ICON_COLORS = {
  active: '#333333',
  inactive: '#999999',
  center: '#FFFFFF',
}

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
                <TabIcon type="star" color={TAB_ICON_COLORS.center} size={48} active />
                <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>推荐</Text>
              </View>
            </View>
          )
        }

        const isOn = tab.key === active
        const iconColor = isOn ? TAB_ICON_COLORS.active : TAB_ICON_COLORS.inactive

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
              <TabIcon type={tab.icon} color={iconColor} size={40} active={isOn} />
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

function TabIcon({ type, color, size, active }: { type: TabIconType; color: string; size: number; active: boolean }) {
  if (type === 'home') {
    return (
      <View style={{ position: 'relative', width: `${size}rpx`, height: `${size - 4}rpx` }}>
        <View style={{ position: 'absolute', left: '4rpx', top: '14rpx', width: `${size - 8}rpx`, height: `${size - 16}rpx`, border: `4rpx solid ${color}`, borderTop: '0', borderRadius: '4rpx' }} />
        <View style={{ position: 'absolute', left: '6rpx', top: '4rpx', width: `${size - 12}rpx`, height: `${size - 12}rpx`, borderLeft: `4rpx solid ${color}`, borderTop: `4rpx solid ${color}`, transform: 'rotate(45deg)', borderRadius: '3rpx' }} />
        {active && <View style={{ position: 'absolute', left: '17rpx', bottom: '0', width: '8rpx', height: '14rpx', background: color, borderRadius: '4rpx 4rpx 0 0' }} />}
      </View>
    )
  }

  if (type === 'heart') {
    return (
      <View style={{ position: 'relative', width: `${size}rpx`, height: `${size - 4}rpx`, transform: 'rotate(-45deg)' }}>
        <View style={{ position: 'absolute', left: '10rpx', top: '12rpx', width: '24rpx', height: '24rpx', background: color, borderRadius: active ? '6rpx' : '5rpx' }} />
        <View style={{ position: 'absolute', left: '10rpx', top: '2rpx', width: '24rpx', height: '24rpx', background: color, borderRadius: '50%' }} />
        <View style={{ position: 'absolute', left: '20rpx', top: '12rpx', width: '24rpx', height: '24rpx', background: color, borderRadius: '50%' }} />
      </View>
    )
  }

  if (type === 'message') {
    return (
      <View style={{ position: 'relative', width: `${size}rpx`, height: `${size - 4}rpx` }}>
        <View style={{ position: 'absolute', left: '1rpx', top: '2rpx', width: `${size - 4}rpx`, height: `${size - 12}rpx`, border: `4rpx solid ${color}`, borderRadius: '10rpx' }} />
        <View style={{ position: 'absolute', left: '25rpx', bottom: '0', width: '12rpx', height: '12rpx', borderRight: `4rpx solid ${color}`, borderBottom: `4rpx solid ${color}`, transform: 'skew(-28deg)' }} />
        <View style={{ position: 'absolute', left: '11rpx', top: '15rpx', width: '5rpx', height: '5rpx', borderRadius: '50%', background: color }} />
        <View style={{ position: 'absolute', left: '21rpx', top: '15rpx', width: '5rpx', height: '5rpx', borderRadius: '50%', background: color }} />
      </View>
    )
  }

  if (type === 'profile') {
    return (
      <View style={{ position: 'relative', width: `${size}rpx`, height: `${size - 4}rpx` }}>
        <View style={{ position: 'absolute', left: '12rpx', top: '1rpx', width: '16rpx', height: '16rpx', border: `4rpx solid ${color}`, borderRadius: '50%' }} />
        <View style={{ position: 'absolute', left: '3rpx', top: '23rpx', width: '34rpx', height: '18rpx', border: `4rpx solid ${color}`, borderBottom: '0', borderRadius: '20rpx 20rpx 0 0' }} />
        {active && <View style={{ position: 'absolute', right: '0', bottom: '0', width: '14rpx', height: '14rpx', borderRadius: '50%', border: '3rpx solid #FFFFFF', background: '#2876FF' }} />}
      </View>
    )
  }

  return (
    <View style={{ position: 'relative', width: `${size}rpx`, height: `${size - 2}rpx` }}>
      <Text style={{ color, fontSize: `${size + 8}rpx`, fontWeight: 700, lineHeight: `${size}rpx` }}>☆</Text>
    </View>
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
