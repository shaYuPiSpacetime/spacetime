import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getWindowMetrics } from '@/utils/system'

interface LanhuSubNavProps {
  title: string
  onBack: () => void
  titleColor?: string
}

export default function LanhuSubNav({ title, onBack, titleColor = '#0C285A' }: LanhuSubNavProps) {
  const menu = Taro.getMenuButtonBoundingClientRect?.()
  const system = getWindowMetrics()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const top = menu ? menu.top * scale : 88
  const height = menu ? menu.height * scale : 64
  const menuLeft = menu ? menu.left * scale : 598
  const titleSafeRight = Math.max(172, 750 - menuLeft + 24)
  const navHeight = Math.max(164, top + height + 24)
  const titleTop = top + (height - 45) / 2

  return (
    <View style={{ position: 'relative', width: '750rpx', height: `${navHeight}rpx`, paddingRight: `${titleSafeRight - 172}rpx`, boxSizing: 'border-box' }}>
      <View
        onClick={onBack}
        hoverClass="btn-hover"
        style={{
          position: 'absolute',
          left: '0',
          top: `${top}rpx`,
          width: '112rpx',
          height: `${height}rpx`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99,
        }}
      >
        <View
          style={{
            width: '24rpx',
            height: '24rpx',
            borderLeft: '4rpx solid #607086',
            borderBottom: '4rpx solid #607086',
            transform: 'rotate(45deg)',
            marginLeft: '12rpx',
          }}
        />
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: `${titleTop}rpx`,
          width: '750rpx',
          color: titleColor,
          fontSize: '32rpx',
          lineHeight: '45rpx',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </View>
  )
}
