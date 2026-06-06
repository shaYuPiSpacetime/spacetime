import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

import homeIcon from '@/assets/icons/tab-home.png'
import workIcon from '@/assets/icons/tab-work.png'
import recommendIcon from '@/assets/icons/tab-recommend.png'
import messageIcon from '@/assets/icons/tab-message.png'
import profileIcon from '@/assets/icons/tab-profile-active.png'

export type TabKey = 'index' | 'community' | 'recommend' | 'chat' | 'profile'

interface Tab {
  key: TabKey
  label: string
  path: string
  icon: string
  isCenter?: boolean
}

const TABS: Tab[] = [
  { key: 'index', label: '成家', path: '/pages/index/index', icon: homeIcon },
  { key: 'community', label: '立业', path: '/pages/community/index', icon: workIcon },
  { key: 'recommend', label: '推荐', path: '/pages/recommend/index', icon: recommendIcon, isCenter: true },
  { key: 'chat', label: '消息', path: '/pages/chat/index', icon: messageIcon },
  { key: 'profile', label: '我的', path: '/pages/profile/index', icon: profileIcon },
]

interface Props {
  active: TabKey
}

/**
 * 底部 TabBar — 1:1 还原 Figma node 178:67
 * 固定底部、覆盖原生 tabBar（zIndex 高）
 *
 * Figma（750px ÷ 2）：
 * - 白色圆弧顶部过渡，无生硬横线
 * - 中间蓝圆 126→56px，向上突出，阴影 0 2px 4px rgba(61,139,239,0.5)
 * - 普通 icon 40×35→20×18px，标签 fontSize 20→10px
 * - active #333333 / inactive #999999
 */
export default function AppTabBar({ active }: Props) {
  const handlePress = (tab: Tab) => {
    if (tab.key === active) return
    Taro.switchTab({ url: tab.path })
  }

  return (
    <View
      style={{
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 9999,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#FFFFFF',
      }}
    >
      {/* 白色圆弧过渡 — 绝对定位在 tab 上方，不额外占用高度 */}
      <View
        style={{
          position: 'absolute',
          top: '-24rpx',
          left: '0',
          right: '0',
          height: '28rpx',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            width: '828rpx',
            height: '96rpx',
            marginLeft: '-414rpx',
            borderRadius: '50%',
            background: '#FFFFFF',
          }}
        />
      </View>

      {/* Tab 主体 */}
      <View
        style={{
          height: '104rpx',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {TABS.map((tab) => {
          if (tab.isCenter) {
            return (
              <View
                key={tab.key}
                style={{ flex: 1, position: 'relative', height: '104rpx' }}
                onClick={() => handlePress(tab)}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: '-44rpx',
                    left: '50%',
                    marginLeft: '-64rpx',
                    width: '128rpx',
                    height: '128rpx',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: '-48rpx',
                    left: '50%',
                    marginLeft: '-54rpx',
                    width: '108rpx',
                    height: '108rpx',
                    borderRadius: '50%',
                    background: '#2876FF',
                    boxShadow: '0 4rpx 8rpx rgba(61,139,239,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image src={tab.icon} style={{ width: '46rpx', height: '44rpx' }} mode="aspectFit" />
                  <Text style={{ fontSize: '20rpx', color: '#FFFFFF', lineHeight: '22rpx', marginTop: '2rpx' }}>
                    {tab.label}
                  </Text>
                </View>
              </View>
            )
          }

          const isOn = tab.key === active
          return (
            <View
              key={tab.key}
              style={{ flex: 1, height: '104rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => handlePress(tab)}
            >
              <Image
                src={tab.icon}
                style={{ width: '40rpx', height: '36rpx', marginBottom: '6rpx', opacity: isOn ? 1 : 0.55 }}
                mode="aspectFit"
              />
              <Text style={{ fontSize: '20rpx', lineHeight: '28rpx', color: isOn ? '#333333' : '#999999' }}>{tab.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
