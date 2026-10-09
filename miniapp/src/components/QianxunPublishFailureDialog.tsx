import { Image, Text, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'
import {
  COMMUNITY_COPY_KEYS,
  resolveCommunityCopy,
  resolveCommunityFeedback,
  type CommunityConfig,
} from '@/services/community'

interface QianxunPublishFailureDialogProps {
  visible: boolean
  failureMessage?: string
  config?: CommunityConfig
  onClose: () => void
}

/** 蓝湖「千寻互动-我的动态-发布失败」弹窗。 */
export default function QianxunPublishFailureDialog({
  visible,
  failureMessage,
  config,
  onClose,
}: QianxunPublishFailureDialogProps) {
  if (!visible) return null

  return (
    <View
      id="qianxun-publish-failure-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 101,
        boxSizing: 'border-box',
        paddingTop: '386rpx',
        background: 'rgba(0,0,0,.25)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <View
        id="qianxun-publish-failure-dialog"
        onClick={event => event.stopPropagation()}
        style={{
          width: '620rpx',
          height: '538rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '79rpx 50rpx 28rpx',
          boxSizing: 'border-box',
        }}
      >
        <View style={{ position: 'relative', width: '520rpx', height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src={miniappOssIcons.qianxunPublishFailure} mode="aspectFit" style={{ width: '180rpx', height: '126rpx' }} />
        </View>
        <Text style={{ display: 'block', height: '44rpx', color: '#333333', fontSize: '28rpx', lineHeight: '44rpx', fontWeight: 600, textAlign: 'center', marginTop: '30rpx' }}>
          {resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishFailedTitle)}
        </Text>
        <Text
          id="qianxun-publish-failure-reason"
          style={{
            display: '-webkit-box',
            height: '78rpx',
            color: '#999999',
            fontSize: '25rpx',
            lineHeight: '39rpx',
            marginTop: '18rpx',
            overflow: 'hidden',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.publishRejectedDefault, failureMessage)}
        </Text>
        <View id="qianxun-publish-failure-confirm" onClick={onClose} style={{ width: '520rpx', height: '68rpx', borderRadius: '7rpx', background: '#2876FF', marginTop: '67rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '27rpx', lineHeight: '38rpx' }}>我知道了</Text>
        </View>
      </View>
    </View>
  )
}
