import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { CSSProperties } from 'react'
import { getWindowMetrics } from '@/utils/system'

const TAB_ROUTES = new Set([
  '/pages/index/index',
  '/pages/recommend/index',
  '/pages/community/index',
  '/pages/chat/index',
  '/pages/profile/index',
])

export interface NativeNavigationMetrics {
  menuTop: number
  menuHeight: number
  menuLeft: number
  titleTop: number
  navigationHeight: number
}

export function getNativeNavigationMetrics(): NativeNavigationMetrics {
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const menu = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    ? Taro.getMenuButtonBoundingClientRect()
    : undefined
  const menuTop = menu ? menu.top * scale : 88
  const menuHeight = menu ? menu.height * scale : 64
  const menuLeft = menu ? menu.left * scale : 598

  return {
    menuTop,
    menuHeight,
    menuLeft,
    titleTop: menuTop + (menuHeight - 45) / 2,
    navigationHeight: Math.max(164, menuTop + menuHeight + 24),
  }
}

export function MiniappBackIcon({ color = '#607086', size = 24, borderWidth = 4 }: { color?: string; size?: number; borderWidth?: number }) {
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const iconUnit = isWeapp ? 'rpx' : 'px'
  const iconMetric = (value: number) => (isWeapp ? value : value / 2)

  return (
    <View
      aria-hidden
      style={{
        width: `${iconMetric(size)}${iconUnit}`,
        height: `${iconMetric(size)}${iconUnit}`,
        borderLeft: `${iconMetric(borderWidth)}${iconUnit} solid ${color}`,
        borderBottom: `${iconMetric(borderWidth)}${iconUnit} solid ${color}`,
        transform: 'rotate(45deg)',
        boxSizing: 'border-box',
      }}
    />
  )
}

interface NativeNavigationProps {
  title?: string
  titleColor?: string
  background?: string
  showBack?: boolean
  onBack?: () => void
  fallbackUrl?: string
  overlay?: boolean
  titleFontSize?: number
  titleFontWeight?: CSSProperties['fontWeight']
}

export default function NativeNavigation({
  title,
  titleColor = '#0C285A',
  background = '#FFFFFF',
  showBack = true,
  onBack,
  fallbackUrl = '/pages/index/index',
  overlay = false,
  titleFontSize = 32,
  titleFontWeight = 600,
}: NativeNavigationProps) {
  const metrics = getNativeNavigationMetrics()
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (Taro.getCurrentPages().length > 1) {
      void Taro.navigateBack()
    } else if (TAB_ROUTES.has(fallbackUrl)) {
      void Taro.switchTab({ url: fallbackUrl })
    } else {
      void Taro.redirectTo({ url: fallbackUrl })
    }
  }

  return (
    <View
      style={{
        position: overlay ? 'absolute' : 'relative',
        left: 0,
        top: 0,
        width: '750rpx',
        height: `${metrics.navigationHeight}rpx`,
        background,
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {showBack ? (
        <View
          data-role="native-navigation-back"
          onClick={handleBack}
          hoverClass="btn-hover"
          style={{
            position: 'absolute',
            left: 0,
            top: `${Math.max(0, metrics.menuTop - 20)}rpx`,
            width: '112rpx',
            height: `${metrics.menuHeight + 40}rpx`,
            paddingLeft: '28rpx',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            zIndex: 2,
          }}
        >
          <MiniappBackIcon color={titleColor} />
        </View>
      ) : null}
      {title ? (
        <Text
          style={{
            position: 'absolute',
            left: 0,
            top: `${metrics.titleTop}rpx`,
            width: '750rpx',
            color: titleColor,
            fontSize: `${titleFontSize}rpx`,
            fontWeight: titleFontWeight,
            lineHeight: '45rpx',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      ) : null}
    </View>
  )
}
