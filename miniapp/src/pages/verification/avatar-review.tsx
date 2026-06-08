import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import VerificationShell from './components/VerificationShell'
import fallbackAvatar from '@/assets/lanhu/verification/avatar-good.png'

export default function VerificationAvatarReviewPage() {
  const { userInfo } = useLogin()
  const avatar = userInfo.avatarLocalPath || userInfo.avatar || fallbackAvatar

  return (
    <VerificationShell
      stage="avatar"
      onPrimary={() => Taro.redirectTo({ url: '/pages/verification/intro' })}
      onBack={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}
    >
      <View
        style={{
          position: 'absolute',
          left: '112rpx',
          top: '668rpx',
          width: '526rpx',
          height: '526rpx',
          borderRadius: '12rpx',
          overflow: 'hidden',
          background: '#DDE9F7',
        }}
      >
        <Image src={avatar} mode="aspectFill" style={{ width: '526rpx', height: '526rpx' }} />
        <View
          style={{
            position: 'absolute',
            left: '185rpx',
            bottom: '34rpx',
            width: '156rpx',
            height: '60rpx',
            borderRadius: '30rpx',
            background: 'rgba(255,255,255,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#999999', fontSize: '24rpx', lineHeight: '34rpx' }}>审核中</Text>
        </View>
      </View>
    </VerificationShell>
  )
}
