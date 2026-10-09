import { Text, View } from '@tarojs/components'
import {
  resolveCommunityStatusLabel,
  type CommunityConfig,
} from '@/services/community'

interface QianxunPostStatusBadgeProps {
  config?: CommunityConfig
  status: string
  statusName?: string
  onFailure?: () => void
}

/** 千寻互动「我的动态」发布状态；待审态尺寸与蓝湖画板保持一致。 */
export default function QianxunPostStatusBadge({
  config,
  status,
  statusName,
  onFailure,
}: QianxunPostStatusBadgeProps) {
  if (status === 'published') return null

  const rejected = status === 'rejected'
  return (
    <View
      data-role="qianxun-my-post-status"
      data-status={status}
      onClick={rejected ? onFailure : undefined}
      style={{
        minWidth: rejected ? '96rpx' : '88rpx',
        height: rejected ? '50rpx' : '48rpx',
        borderRadius: rejected ? '8rpx' : '6rpx',
        padding: rejected ? '0 11rpx' : '0 10rpx',
        background: rejected ? '#E83333' : '#F9FAFB',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <Text
        data-role="qianxun-my-post-status-label"
        style={{
          color: rejected ? '#FFFFFF' : '#2876FF',
          fontSize: '23rpx',
          lineHeight: '32rpx',
          whiteSpace: 'nowrap',
        }}
      >
        {resolveCommunityStatusLabel(config, status, statusName)}
      </Text>
    </View>
  )
}
