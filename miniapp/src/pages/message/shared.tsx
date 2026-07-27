import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { ReactNode } from 'react'
import { getNativeNavigationMetrics, MiniappBackIcon } from '@/components/NativeNavigation'
import { miniappOssIcons } from '@/constants/ossIcons'

export const MESSAGE_AVATAR = miniappOssIcons.messageAvatarXiaoming

type MessageNavProps = {
  title?: string
  avatarUrl?: string
  center?: boolean
  children?: ReactNode
  onBack?: () => void
}

export function MessageNav({
  title,
  avatarUrl,
  center = false,
  children,
  onBack,
}: MessageNavProps) {
  const { menuTop, menuHeight, titleTop, navigationHeight } = getNativeNavigationMetrics()
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  const unit = isWeapp ? 'rpx' : 'px'
  const metric = (value: number) => (isWeapp ? value : value / 2)
  const back = () => {
    if (onBack) return onBack()
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) void Taro.navigateBack()
    else void Taro.switchTab({ url: '/pages/chat/index' })
  }

  return (
    <View
      style={{
        position: 'relative',
        width: isWeapp ? '750rpx' : '100%',
        height: `${metric(navigationHeight)}${unit}`,
        flexShrink: 0,
      }}
    >
      <View
        className="message-nav-back"
        onClick={back}
        style={{
          left: 0,
          top: `${metric(Math.max(0, menuTop - 20))}${unit}`,
          width: `${metric(112)}${unit}`,
          height: `${metric(menuHeight + 40)}${unit}`,
          paddingLeft: `${metric(28)}${unit}`,
        }}
      >
        <MiniappBackIcon color="#607086" />
      </View>
      {children ? (
        <View
          data-role="message-navigation-slot"
          className="message-nav-slot"
          style={{ top: `${metric(titleTop)}${unit}` }}
        >
          {children}
        </View>
      ) : (
        <View
          className={center ? 'message-nav-title message-nav-title--center' : 'message-nav-title'}
          style={{ top: `${metric(titleTop)}${unit}` }}
        >
          {avatarUrl ? (
            <Image className="message-nav-avatar" src={avatarUrl} mode="aspectFill" />
          ) : null}
          <Text>{title}</Text>
        </View>
      )}
    </View>
  )
}

export function MessageAvatar({
  src = MESSAGE_AVATAR,
  size = 50,
  unread,
}: {
  src?: string
  size?: number
  unread?: number
}) {
  return (
    <View className="message-avatar-wrap" style={{ width: `${size}px`, height: `${size}px` }}>
      <Image className="message-avatar" src={src} mode="aspectFill" />
      {unread ? <Text className="message-unread">{unread}</Text> : null}
    </View>
  )
}

export function ChannelBadge({ type }: { type: 'assistant' | 'system' }) {
  return (
    <View className="message-channel-badge">
      <Image
        className="message-channel-icon"
        src={
          type === 'assistant' ? miniappOssIcons.messageAssistant : miniappOssIcons.messageSystem
        }
        mode="aspectFit"
      />
    </View>
  )
}

export function DotsButton({
  onClick,
  label = '更多操作',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <View className="message-dots-button" onClick={onClick} aria-label={label}>
      <View className="message-dot" />
      <View className="message-dot" />
      <View className="message-dot" />
    </View>
  )
}
