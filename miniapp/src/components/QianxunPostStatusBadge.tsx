import { Text, View } from '@tarojs/components'
import { isCommunityPostFailure } from '@/domain/qianxunInteractionPresentation'
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

  const rejected = isCommunityPostFailure(status)
  return (
    <View onClick={rejected && onFailure ? event => {
      event.stopPropagation()
      onFailure()
    } : undefined}>
    <View
      className={`qianxun-my-post-status${rejected ? ' qianxun-my-post-status-rejected' : ''}`}
      data-role="qianxun-my-post-status"
      data-status={status}
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
    {rejected ? <View style={{ marginTop: '12rpx', fontSize: '20rpx', lineHeight: '32rpx', color: '#8F8F8F' }}>
      <View>仅自己可见</View>
      <View style={{ color: '#2876FF', padding: '8rpx 0' }}>查看原因 ›</View>
    </View> : null}
    </View>
  )
}
