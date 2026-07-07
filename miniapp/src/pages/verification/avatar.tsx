import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import VerificationShell from './components/VerificationShell'
import AvatarRuleBubbles from './components/AvatarRuleBubbles'
import { chooseAndCropAvatar } from '@/utils/avatar'
import goodAvatar from '@/assets/lanhu/verification/avatar-good.webp'
import badAvatar from '@/assets/lanhu/verification/avatar-bad.webp'

const BAD_CASES = [
  { label: '非人物照', image: badAvatar, mask: '非本人' },
  { label: '风景照', image: goodAvatar, mask: '无人物' },
  { label: '模糊遮挡', image: goodAvatar, mask: '不清晰' },
  { label: '无正脸', image: goodAvatar, mask: '侧脸' },
]

export default function VerificationAvatarPage() {
  const [choosing, setChoosing] = useState(false)

  const handleChoose = async () => {
    if (choosing) return
    setChoosing(true)
    try {
      const avatarPath = await chooseAndCropAvatar()
      if (!avatarPath) return
      await Taro.redirectTo({ url: `/pages/verification/avatar-crop?path=${encodeURIComponent(avatarPath)}` })
    } catch {
      Taro.showToast({ title: '已取消选择', icon: 'none' })
    } finally {
      setChoosing(false)
    }
  }

  return (
    <VerificationShell
      stage="avatar"
      primaryText={choosing ? '正在打开相册' : '知道了，去选照片'}
      onPrimary={handleChoose}
      onBack={() => Taro.redirectTo({ url: '/pages/verification/basic' })}
    >
      <View
        style={{
          position: 'absolute',
          left: '25rpx',
          top: '558rpx',
          width: '700rpx',
          height: '858rpx',
          borderRadius: '32rpx',
          background: '#FFFFFF',
          padding: '38rpx 30rpx',
          boxSizing: 'border-box',
          boxShadow: '0 12rpx 30rpx rgba(11, 38, 90, 0.06)',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '32rpx', fontWeight: 800, lineHeight: '45rpx' }}>
          选一张你满意的头像
        </Text>
        <Text style={{ display: 'block', color: '#697E9C', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '10rpx' }}>
          清晰正脸照片更容易通过审核
        </Text>
        <View style={{ position: 'relative', marginTop: '34rpx', height: '350rpx' }}>
          <AvatarExampleCard />
          <AvatarRuleBubbles />
        </View>
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '28rpx', fontWeight: 800, lineHeight: '40rpx', marginTop: '66rpx' }}>
          审核不通过示例
        </Text>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '24rpx' }}>
          {BAD_CASES.map((item, index) => (
            <RejectCase key={item.label} label={item.label} image={item.image} mask={item.mask} dimmed={index > 0} />
          ))}
        </View>
      </View>
    </VerificationShell>
  )
}

function AvatarExampleCard() {
  return (
    <View
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '336rpx',
        height: '350rpx',
        borderRadius: '28rpx',
        background: '#F6F9FE',
        padding: '10rpx',
        boxSizing: 'border-box',
      }}
    >
      <Image src={goodAvatar} mode="aspectFill" style={{ width: '316rpx', height: '330rpx', borderRadius: '22rpx' }} />
      <View
        style={{
          position: 'absolute',
          left: '232rpx',
          bottom: '-16rpx',
          width: '110rpx',
          height: '110rpx',
          borderRadius: '55rpx',
          background: '#2876FF',
          border: '8rpx solid #FFFFFF',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10rpx 24rpx rgba(40,118,255,0.25)',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '60rpx', lineHeight: '70rpx' }}>✓</Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: '22rpx',
          top: '22rpx',
          height: '46rpx',
          borderRadius: '23rpx',
          background: 'rgba(40,118,255,0.92)',
          padding: '0 18rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '22rpx', fontWeight: 700, lineHeight: '31rpx' }}>示例头像</Text>
      </View>
    </View>
  )
}

function RejectCase({ label, image, mask, dimmed }: { label: string; image: string; mask: string; dimmed: boolean }) {
  return (
    <View style={{ width: '142rpx' }}>
      <View style={{ position: 'relative', width: '142rpx', height: '142rpx', borderRadius: '18rpx', overflow: 'hidden', background: '#F6F9FE' }}>
        <Image
          src={image}
          mode="aspectFill"
          style={{
            width: '142rpx',
            height: '142rpx',
            opacity: dimmed ? 0.58 : 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: '0',
            right: '0',
            bottom: '0',
            height: '44rpx',
            background: 'rgba(12,40,90,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: '20rpx', lineHeight: '28rpx' }}>{mask}</Text>
        </View>
      </View>
      <Text style={{ display: 'block', color: '#697E9C', fontSize: '23rpx', lineHeight: '32rpx', textAlign: 'center', marginTop: '16rpx' }}>
        {label}
      </Text>
    </View>
  )
}
