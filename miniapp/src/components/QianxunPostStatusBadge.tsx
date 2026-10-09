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
      className={`qianxun-my-post-status${rejected ? ' qianxun-my-post-status-rejected' : ''}`}
      data-role="qianxun-my-post-status"
      data-status={status}
      onClick={rejected && onFailure ? event => {
        event.stopPropagation()
        onFailure()
      } : undefined}
      style={{
        width: '88rpx',
        height: '48rpx',
        borderRadius: rejected ? '8rpx' : '6rpx',
        background: rejected ? '#EF0000' : '#F8F9FB',
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
          fontSize: '20rpx',
          lineHeight: '28rpx',
          whiteSpace: 'nowrap',
        }}
      >
        {resolveCommunityStatusLabel(config, status, statusName)}
      </Text>
    </View>
  )
}
