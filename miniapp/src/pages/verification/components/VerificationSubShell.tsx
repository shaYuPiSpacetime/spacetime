import type { ReactNode } from 'react'
import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import bg from '@/assets/lanhu/verification/verification-bg.webp'

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
  const { menuTop, menuHeight, titleTop } = getNativeNavigationMetrics()

  return (
    <View style={{ position: 'relative', width: '750rpx', height: '176rpx' }}>
      <View
        style={{ position: 'absolute', left: 0, top: `${Math.max(0, menuTop - 20)}rpx`, width: '112rpx', height: `${menuHeight + 40}rpx`, paddingLeft: '28rpx', display: 'flex', alignItems: 'center', boxSizing: 'border-box', zIndex: 10 }}
        onClick={onBack}
      >
        <MiniappBackIcon color="#607086" />
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: `${titleTop}rpx`,
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
