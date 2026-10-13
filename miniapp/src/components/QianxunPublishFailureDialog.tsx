import { Image, ScrollView, Text, View } from '@tarojs/components'
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
        padding: '32rpx',
        background: 'rgba(0,0,0,.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        id="qianxun-publish-failure-dialog"
        onClick={event => event.stopPropagation()}
        style={{
          width: '620rpx',
          maxHeight: '80vh',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '48rpx 50rpx 28rpx',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <View style={{ position: 'relative', width: '520rpx', height: '126rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src={miniappOssIcons.qianxunPublishFailure} mode="aspectFit" style={{ width: '180rpx', height: '126rpx' }} />
        </View>
        <Text style={{ display: 'block', height: '44rpx', color: '#333333', fontSize: '28rpx', lineHeight: '44rpx', fontWeight: 600, textAlign: 'center', marginTop: '30rpx' }}>
          {resolveCommunityCopy(config, COMMUNITY_COPY_KEYS.publishFailedTitle)}
        </Text>
        <ScrollView scrollY style={{ maxHeight: '35vh', minHeight: 0, marginTop: '18rpx' }}>
        <Text
          id="qianxun-publish-failure-reason"
          style={{
            display: 'block',
            color: '#999999',
            fontSize: '25rpx',
            lineHeight: '39rpx',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {resolveCommunityFeedback(config, COMMUNITY_COPY_KEYS.publishRejectedDefault, failureMessage)}
        </Text>
        </ScrollView>
        <View id="qianxun-publish-failure-confirm" onClick={onClose} style={{ width: '520rpx', height: '80rpx', flexShrink: 0, borderRadius: '7rpx', background: '#2876FF', marginTop: '32rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: '27rpx', lineHeight: '38rpx' }}>我知道了</Text>
        </View>
      </View>
    </View>
  )
}
