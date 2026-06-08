import type { ReactNode } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import bg from '@/assets/lanhu/verification/verification-bg.png'

interface VerificationSubShellProps {
  title: string
  children: ReactNode
  contentHeight?: string
  scroll?: boolean
  onBack?: () => void
}

export default function VerificationSubShell({
  title,
  children,
  contentHeight = '1678rpx',
  scroll = false,
  onBack,
}: VerificationSubShellProps) {
  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    Taro.redirectTo({ url: '/pages/verification/triple' })
  }

  const content = (
    <View style={{ position: 'relative', width: '750rpx', minHeight: contentHeight, boxSizing: 'border-box', paddingBottom: '60rpx' }}>
      <Header title={title} onBack={handleBack} />
      {children}
    </View>
  )

  return (
    <View style={{ minHeight: '100vh', background: '#F3F7FB', position: 'relative', overflow: 'hidden' }}>
      <Image src={bg} mode="widthFix" style={{ position: 'fixed', left: '0', top: '0', width: '750rpx' }} />
      {scroll ? (
        <ScrollView scrollY style={{ height: '100vh', position: 'relative', zIndex: 1 }} showScrollbar={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={{ position: 'relative', zIndex: 1 }}>{content}</View>
      )}
    </View>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const menu = Taro.getMenuButtonBoundingClientRect?.()
  const system = Taro.getSystemInfoSync()
  const scale = system.windowWidth ? 750 / system.windowWidth : 2
  const top = menu ? `${menu.top * scale}rpx` : '88rpx'
  const height = menu ? `${menu.height * scale}rpx` : '64rpx'
  const arrowTop = menu ? `${((menu.height * scale) - 28) / 2}rpx` : '14rpx'
  const titleTop = menu ? `${menu.top * scale + ((menu.height * scale) - 45) / 2}rpx` : '96rpx'

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '176rpx' }}>
      <View
        style={{ position: 'absolute', left: '20rpx', top, width: '56rpx', height, zIndex: 10 }}
        onClick={onBack}
      >
        <View
          style={{
            position: 'absolute',
            left: '14rpx',
            top: arrowTop,
            width: '28rpx',
            height: '28rpx',
            borderLeft: '5rpx solid #697E9C',
            borderBottom: '5rpx solid #697E9C',
            transform: 'rotate(45deg)',
          }}
        />
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: titleTop,
          width: '750rpx',
          color: '#0C285A',
          fontSize: '32rpx',
          fontWeight: 500,
          lineHeight: '45rpx',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </View>
  )
}
