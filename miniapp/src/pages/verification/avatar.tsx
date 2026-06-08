import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import VerificationShell from './components/VerificationShell'
import AvatarRuleBubbles from './components/AvatarRuleBubbles'
import { chooseAndCropAvatar } from '@/utils/avatar'
import goodAvatar from '@/assets/lanhu/verification/avatar-good.png'
import badAvatar from '@/assets/lanhu/verification/avatar-bad.png'

const BAD_CASES = ['非人物照', '风景照', '模糊遮挡', '无正脸']

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
          height: '838rpx',
          borderRadius: '18rpx',
          background: '#FFFFFF',
          padding: '52rpx 30rpx',
          boxSizing: 'border-box',
        }}
      >
        <Text style={{ display: 'block', color: '#0C285A', fontSize: '29rpx', fontWeight: 800, lineHeight: '42rpx' }}>
          选一张你满意的头像
        </Text>
        <View style={{ position: 'relative', marginTop: '54rpx', height: '336rpx' }}>
          <Image src={goodAvatar} mode="aspectFill" style={{ width: '326rpx', height: '336rpx', borderRadius: '12rpx' }} />
          <View
            style={{
              position: 'absolute',
              left: '238rpx',
              bottom: '-18rpx',
              width: '114rpx',
              height: '114rpx',
              borderRadius: '57rpx',
              background: '#2876FF',
              border: '8rpx solid #FFFFFF',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '62rpx', lineHeight: '74rpx' }}>✓</Text>
          </View>
          <AvatarRuleBubbles />
        </View>
        <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '72rpx' }}>
          以下照片不能通过审核
        </Text>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '22rpx' }}>
          {BAD_CASES.map((item, index) => (
            <View key={item} style={{ width: '140rpx' }}>
              <Image
                src={index === 0 ? badAvatar : goodAvatar}
                mode="aspectFill"
                style={{
                  width: '140rpx',
                  height: '140rpx',
                  borderRadius: '10rpx',
                  filter: index === 2 ? 'blur(6rpx)' : 'none',
                  opacity: index === 3 ? 0.72 : 1,
                }}
              />
              <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', textAlign: 'center', marginTop: '20rpx' }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </VerificationShell>
  )
}
