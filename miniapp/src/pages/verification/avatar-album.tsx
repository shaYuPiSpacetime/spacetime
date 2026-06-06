import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import VerificationShell from './components/VerificationShell'
import goodAvatar from '@/assets/lanhu/verification/avatar-good.png'
import badAvatar from '@/assets/lanhu/verification/avatar-bad.png'

export default function VerificationAvatarAlbumPage() {
  const handleChoose = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1 })
      const path = res.tempFilePaths[0]
      if (!path) return
      Taro.navigateTo({ url: `/pages/verification/avatar-crop?path=${encodeURIComponent(path)}` })
    } catch {
      Taro.showToast({ title: '已取消选择', icon: 'none' })
    }
  }

  return (
    <VerificationShell stage="avatar" primaryText="知道了，去选照片" onPrimary={handleChoose}>
      <AvatarGuide dimmed />
      <View
        style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.32)', zIndex: 20 }}
        onClick={() => Taro.navigateBack()}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '32rpx 32rpx 0 0',
            background: '#FFFFFF',
            overflow: 'hidden',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <View
            style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleChoose}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx' }}>从相册选取</Text>
          </View>
          <View style={{ height: '16rpx', background: '#F0F4FA' }} />
          <View
            style={{ height: '100rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => Taro.navigateBack()}
            hoverClass="btn-hover"
          >
            <Text style={{ color: '#999999', fontSize: '30rpx', lineHeight: '42rpx' }}>取消</Text>
          </View>
        </View>
      </View>
    </VerificationShell>
  )
}

function AvatarGuide({ dimmed = false }: { dimmed?: boolean }) {
  return (
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
        opacity: dimmed ? 0.74 : 1,
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
        <View style={{ position: 'absolute', left: '346rpx', top: '44rpx' }}>
          {['本人照片', '能看清长相', '展示完美的你'].map((item, index) => (
            <View
              key={item}
              style={{
                position: 'absolute',
                left: '0',
                top: `${index * 94}rpx`,
                height: '58rpx',
                borderRadius: '29rpx',
                background: '#EAF4FF',
                padding: '0 24rpx',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: '25rpx', lineHeight: '34rpx', marginRight: '10rpx' }}>☺</Text>
              <Text style={{ color: '#333333', fontSize: '24rpx', lineHeight: '34rpx' }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={{ display: 'block', color: '#333333', fontSize: '26rpx', lineHeight: '38rpx', marginTop: '72rpx' }}>
        以下照片不能通过审核
      </Text>
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '22rpx' }}>
        {['非人物照', '风景照', '模糊遮挡', '无正脸'].map((item, index) => (
          <View key={item} style={{ width: '140rpx' }}>
            <Image src={index === 0 ? badAvatar : goodAvatar} mode="aspectFill" style={{ width: '140rpx', height: '140rpx', borderRadius: '10rpx' }} />
            <Text style={{ display: 'block', color: '#999999', fontSize: '24rpx', lineHeight: '34rpx', textAlign: 'center', marginTop: '20rpx' }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
