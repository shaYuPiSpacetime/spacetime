import { Image, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useLogin } from '@/hooks/useLogin'
import fallbackAvatar from '@/assets/lanhu/verification/avatar-good.png'

export default function VerificationAvatarCropPage() {
  const router = useRouter()
  const { updateUserInfo } = useLogin()
  const path = decodeURIComponent(String(router.params.path || ''))
  const avatar = path || fallbackAvatar

  const handleConfirm = () => {
    updateUserInfo({
      avatar: avatar,
      avatarLocalPath: avatar,
      avatarReviewStatus: 'pending',
    })
    Taro.redirectTo({ url: '/pages/verification/avatar-review' })
  }

  return (
    <View style={{ minHeight: '100vh', background: '#4B4B4B', position: 'relative', overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          left: '94rpx',
          top: '468rpx',
          width: '562rpx',
          height: '812rpx',
          overflow: 'hidden',
        }}
      >
        <Image src={avatar} mode="aspectFill" style={{ width: '562rpx', height: '812rpx', opacity: 0.62 }} />
        <View
          style={{
            position: 'absolute',
            left: '14rpx',
            top: '104rpx',
            width: '534rpx',
            height: '534rpx',
            border: '6rpx dashed #FFFFFF',
            boxSizing: 'border-box',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '14rpx',
            top: '104rpx',
            width: '534rpx',
            height: '534rpx',
            border: '6rpx solid #FFFFFF',
            borderRadius: '12rpx',
            boxSizing: 'border-box',
          }}
        />
        <Text
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            top: '674rpx',
            color: '#FFFFFF',
            fontSize: '24rpx',
            lineHeight: '36rpx',
            textAlign: 'center',
          }}
        >
          为保证卡片展示完整，请将人物主体放虚线框内
        </Text>
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '54rpx',
          bottom: '54rpx',
          color: '#FFFFFF',
          fontSize: '28rpx',
          fontWeight: 700,
          lineHeight: '40rpx',
        }}
        onClick={() => Taro.redirectTo({ url: '/pages/verification/avatar' })}
      >
        取消
      </Text>
      <View
        style={{
          position: 'absolute',
          right: '25rpx',
          bottom: '34rpx',
          width: '148rpx',
          height: '68rpx',
          borderRadius: '8rpx',
          background: '#2876FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleConfirm}
        hoverClass="btn-hover"
      >
        <Text style={{ color: '#FFFFFF', fontSize: '28rpx', fontWeight: 700, lineHeight: '40rpx' }}>确认</Text>
      </View>
    </View>
  )
}
