import { Image, Text, View } from '@tarojs/components'
import { miniappOssIcons } from '@/constants/ossIcons'

interface UnverifiedCertificationModalProps {
  onClose: () => void
  onConfirm: () => void
  description?: string
}

/**
 * 基础准入已完成、核心认证未完成时的全局统一弹窗。
 * 可见按钮自身承接事件，禁止用透明热区覆盖设计稿。
 */
export default function UnverifiedCertificationModal({
  onClose,
  onConfirm,
  description = '完成认证即可关注、心动和私信感兴趣的用户',
}: UnverifiedCertificationModalProps) {
  return (
    <View
      id="common-unverified-modal"
      data-role="common-unverified-modal"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 20000, background: 'rgba(8,20,43,0.46)' }}
    >
      <View
        onClick={event => event.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: '488rpx',
          borderRadius: '40rpx 40rpx 0 0',
          background: 'linear-gradient(180deg, #D8ECFF 0%, #FFFFFF 72%)',
          padding: '58rpx 46rpx calc(38rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
        }}
      >
        <Image
          src={miniappOssIcons.qianxunVerifyNote}
          mode="aspectFit"
          style={{ position: 'absolute', right: '4rpx', top: '-104rpx', width: '268rpx', height: '259rpx' }}
        />
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '38rpx', lineHeight: '54rpx', fontWeight: 800 }}>
          你还未认证
        </Text>
        <Text style={{ display: 'block', width: '500rpx', color: '#68778E', fontSize: '24rpx', lineHeight: '36rpx', marginTop: '22rpx' }}>
          {description}
        </Text>
        <View
          id="common-unverified-confirm"
          data-role="common-unverified-confirm"
          onClick={onConfirm}
          style={{ width: '658rpx', height: '86rpx', borderRadius: '43rpx', background: '#2876FF', margin: '62rpx auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '30rpx', fontWeight: 700 }}>立即认证</Text>
        </View>
      </View>
    </View>
  )
}
