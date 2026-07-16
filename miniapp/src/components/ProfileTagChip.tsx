import { Text, View } from '@tarojs/components'
import type { ProfileTagItem } from '@/utils/profileTags'
import { resolveProfileTagTone } from '@/utils/profileTags'

type ProfileTagChipProps = {
  item: ProfileTagItem
  active?: boolean
  width?: string
  height?: string
  compact?: boolean
  suffix?: string
  onClick?: () => void
}

export default function ProfileTagChip({
  item,
  active = false,
  width,
  height = '52rpx',
  compact = false,
  suffix = '',
  onClick,
}: ProfileTagChipProps) {
  const tone = resolveProfileTagTone(item)
  return (
    <View
      onClick={onClick}
      style={{
        width,
        height,
        maxWidth: '100%',
        padding: compact ? '0 14rpx' : '0 22rpx',
        borderRadius: compact ? '12rpx' : '28rpx',
        border: active ? 'none' : `1rpx solid ${tone.color}33`,
        background: active ? tone.color : tone.background,
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
          color: active ? '#FFFFFF' : tone.color,
          fontSize: compact ? '22rpx' : '24rpx',
          lineHeight: compact ? '32rpx' : '34rpx',
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
