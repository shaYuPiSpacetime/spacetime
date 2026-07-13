import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import { getWindowMetrics } from '@/utils/system'

type HeaderProps = {
  title?: string
  align?: 'left' | 'center'
  underline?: boolean
  showBack?: boolean
  onBack?: () => void
  rightIcon?: 'clean' | 'folder'
  children?: ReactNode
}

export function getLanhuNavigationMetrics() {
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const menu = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
    ? Taro.getMenuButtonBoundingClientRect()
    : undefined

  return {
    menuTop: menu ? menu.top * scale : 96,
    menuHeight: menu ? menu.height * scale : 48,
  }
}

export default function HeartMessageHeader({
  title,
  align = 'left',
  underline = false,
  showBack = false,
  onBack,
  rightIcon,
  children,
}: HeaderProps) {
  const { menuTop, menuHeight } = getLanhuNavigationMetrics()
  const titleTop = menuTop + (menuHeight - 45) / 2
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      void Taro.navigateBack()
    } else {
      void Taro.switchTab({ url: '/pages/community/index' })
    }
  }

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '176rpx', flexShrink: 0 }}>
      {showBack ? (
        <View
          onClick={handleBack}
          style={{
            position: 'absolute',
            left: '24rpx',
            top: `${menuTop}rpx`,
            width: '54rpx',
            height: `${menuHeight}rpx`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            zIndex: 2,
          }}
        >
          <View
            style={{
              width: '22rpx',
              height: '22rpx',
              borderLeft: '4rpx solid #607086',
              borderBottom: '4rpx solid #607086',
              transform: 'rotate(45deg)',
              boxSizing: 'border-box',
            }}
          />
        </View>
      ) : null}

      {title ? (
        <View
          style={{
            position: 'absolute',
            left: align === 'left' ? '25rpx' : '160rpx',
            top: `${titleTop}rpx`,
            width: align === 'left' ? '210rpx' : '430rpx',
            height: '54rpx',
            display: 'flex',
            justifyContent: align === 'left' ? 'flex-start' : 'center',
          }}
        >
          {underline ? (
            <View
              style={{
                position: 'absolute',
                left: '0',
                top: '37rpx',
                width: `${Math.max(64, title.length * 32)}rpx`,
                height: '8rpx',
                borderRadius: '6rpx',
                background: 'rgba(40,118,255,0.8)',
              }}
            />
          ) : null}
          <Text
            style={{
              position: 'relative',
              zIndex: 1,
              color: '#0C285A',
              fontFamily: 'PingFangSC-Medium, PingFang SC, sans-serif',
              fontSize: '32rpx',
              fontWeight: 500,
              lineHeight: '45rpx',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Text>
        </View>
      ) : null}

      {rightIcon === 'clean' ? <CleanIcon top={titleTop - 2} /> : null}
      {rightIcon === 'folder' ? <HeartFolderIcon top={titleTop + 3} /> : null}
      {children}
    </View>
  )
}

function CleanIcon({ top }: { top: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '516rpx',
        top: `${top}rpx`,
        width: '52rpx',
        height: '48rpx',
        transform: 'rotate(18deg)',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '29rpx',
          top: '0',
          width: '7rpx',
          height: '30rpx',
          borderRadius: '4rpx',
          background: '#999999',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '8rpx',
          top: '24rpx',
          width: '36rpx',
          height: '19rpx',
          borderLeft: '7rpx solid #999999',
          borderRight: '7rpx solid #999999',
          borderBottom: '7rpx solid #999999',
          borderRadius: '0 0 24rpx 24rpx',
          boxSizing: 'border-box',
        }}
      />
    </View>
  )
}

function HeartFolderIcon({ top }: { top: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: '512rpx',
        top: `${top}rpx`,
        width: '48rpx',
        height: '42rpx',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: '4rpx',
          top: '7rpx',
          width: '38rpx',
          height: '29rpx',
          border: '3rpx solid #607086',
          borderRadius: '5rpx',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: '8rpx',
          top: '2rpx',
          width: '17rpx',
          height: '10rpx',
          borderLeft: '3rpx solid #607086',
          borderTop: '3rpx solid #607086',
          borderRadius: '4rpx 0 0 0',
          boxSizing: 'border-box',
        }}
      />
      <Text
        style={{
          position: 'absolute',
          right: '-1rpx',
          bottom: '-3rpx',
          color: '#607086',
          fontSize: '20rpx',
          lineHeight: '22rpx',
        }}
      >
        ♥
      </Text>
    </View>
  )
}
