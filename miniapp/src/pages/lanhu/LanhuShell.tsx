import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import AppTabBar, { type TabKey } from '@/components/AppTabBar'

export const LANHU_BLUE = '#2876FF'
export const LANHU_NAVY = '#0C285A'
export const LANHU_SOFT_BG = 'linear-gradient(120deg, #F2FDFD 0%, #F2F5FB 46%, #FFFDF8 100%)'
export const LANHU_DARK = '#151515'
export const LANHU_GOLD = '#FFC969'

type NavTone = 'light' | 'dark'

export function LanhuNav({
  title,
  tone = 'light',
  showBack = false,
  titleLeft,
}: {
  title?: string
  tone?: NavTone
  showBack?: boolean
  titleLeft?: boolean
}) {
  const color = tone === 'dark' ? '#FFFFFF' : LANHU_NAVY

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/index/index' })
    }
  }

  return (
    <View
      style={{
        position: 'relative',
        height: '176rpx',
        width: '750rpx',
        flexShrink: 0,
      }}
    >
      {showBack && (
        <Text
          style={{
            position: 'absolute',
            left: '25rpx',
            top: '92rpx',
            color,
            fontSize: '74rpx',
            lineHeight: '56rpx',
            fontWeight: 300,
            zIndex: 2,
          }}
          onClick={handleBack}
        >
          ‹
        </Text>
      )}
      {title && (
        <Text
          style={{
            position: 'absolute',
            left: titleLeft ? '25rpx' : '0',
            top: '95rpx',
            width: titleLeft ? '420rpx' : '750rpx',
            textAlign: titleLeft ? 'left' : 'center',
            color,
            fontSize: '32rpx',
            fontWeight: 600,
            lineHeight: '45rpx',
          }}
        >
          {title}
        </Text>
      )}
    </View>
  )
}

export function LanhuTopTabs({
  active = '觅缘',
  dark = false,
  onTabClick,
}: {
  active?: '觅缘' | '心印测试' | '精选' | '理想型'
  dark?: boolean
  onTabClick?: (tab: '觅缘' | '心印测试' | '精选' | '理想型') => void
}) {
  const tabs: Array<'觅缘' | '心印测试' | '精选' | '理想型'> = ['觅缘', '心印测试', '精选', '理想型']

  return (
    <View
      style={{
        width: '750rpx',
        height: '176rpx',
        padding: '86rpx 160rpx 0 25rpx',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab === active
        return (
          <View
            key={tab}
            style={{
              marginRight: '28rpx',
              position: 'relative',
              height: '58rpx',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
            onClick={() => onTabClick?.(tab)}
          >
            <Text
              style={{
                color: isActive ? LANHU_NAVY : dark ? '#A4A4A4' : '#9096A4',
                fontSize: isActive ? '34rpx' : '30rpx',
                fontWeight: isActive ? 800 : 600,
                lineHeight: '42rpx',
                textShadow: isActive ? '0 4rpx 0 rgba(40,118,255,0.16)' : 'none',
              }}
            >
              {tab}
            </Text>
            {tab === '觅缘' && (
              <View
                style={{
                  position: 'absolute',
                  right: '-14rpx',
                  top: '-2rpx',
                  minWidth: '28rpx',
                  height: '22rpx',
                  borderRadius: '11rpx',
                  background: '#FF3F5E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4rpx',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: '15rpx', lineHeight: '20rpx' }}>45</Text>
              </View>
            )}
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  left: '0',
                  bottom: '2rpx',
                  width: '52rpx',
                  height: '6rpx',
                  borderRadius: '3rpx',
                  background: LANHU_BLUE,
                }}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

export function LanhuTabBar({ active = 'index' }: { active?: TabKey }) {
  return <AppTabBar active={active} />
}

export function LanhuBottomModal({
  children,
  onClose,
  dark = false,
}: {
  children: ReactNode
  onClose: () => void
  dark?: boolean
}) {
  return (
    <View
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: '32rpx 32rpx 0 0',
          background: dark ? '#1F1D1D' : '#FFFFFF',
          padding: '40rpx 30rpx 56rpx',
          boxSizing: 'border-box',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </View>
    </View>
  )
}
