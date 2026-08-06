import { Text, View } from '@tarojs/components'
import type { ProfileTagItem } from '@/utils/profileTags'
import { resolveProfileTagTone } from '@/utils/profileTags'

type ProfileTagChipProps = {
  item: ProfileTagItem
  active?: boolean
  variant?: 'soft' | 'selection' | 'selected-list'
  width?: string
  height?: string
  compact?: boolean
  suffix?: string
  onClick?: () => void
}

export default function ProfileTagChip({
  item,
  active = false,
  variant = 'soft',
  width,
  height = '52rpx',
  compact = false,
  suffix = '',
  onClick,
}: ProfileTagChipProps) {
  const tone = resolveProfileTagTone(item)
  const isSelection = variant === 'selection'
  const isSelectedList = variant === 'selected-list'
  const background = active
    ? tone.color
    : isSelection
      ? '#F8F9FB'
      : isSelectedList
        ? '#FFFFFF'
        : tone.background
  const borderColor = isSelection || isSelectedList ? '#D9DDE4' : `${tone.color}33`
  const textColor = active ? '#FFFFFF' : isSelectedList ? '#333333' : tone.color
  return (
    <View
      onClick={onClick}
      style={{
        width,
        height,
        maxWidth: '100%',
        padding: compact ? '0 14rpx' : '0 22rpx',
        borderRadius: compact || isSelection || isSelectedList ? '12rpx' : '28rpx',
        border: active ? 'none' : `1rpx solid ${borderColor}`,
        background,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <Text
        style={{
          maxWidth: '100%',
          color: textColor,
          fontSize: isSelection ? '28rpx' : compact ? '22rpx' : '24rpx',
          lineHeight: isSelection ? '40rpx' : compact ? '32rpx' : '34rpx',
          fontWeight: active ? 700 : 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item.label}{suffix}
      </Text>
    </View>
  )
}
