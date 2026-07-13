import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import avatarImage from '@/assets/lanhu/heart-message/heart-avatar.webp'

const people = Array.from({ length: 4 }, (_, index) => ({
  id: index + 1,
  nickname: '一只筱脑虎',
  location: '现居浙江杭州·河南人',
}))

export default function MutualLikesPage() {
  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}>
      <HeartMessageHeader title="相互喜欢(4人)" align="center" showBack />
      <View style={{ width: '700rpx', margin: '0 auto' }}>
        {people.map((person, index) => (
          <View
            key={person.id}
            style={{
              width: '700rpx',
              height: '160rpx',
              borderTop: index ? '1rpx solid #EFF4FC' : '0',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Image src={avatarImage} mode="aspectFill" style={{ width: '100rpx', height: '100rpx', borderRadius: '50%' }} />
            <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{person.nickname}</Text>
              <Text style={{ display: 'block', marginTop: '10rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx' }}>{person.location}</Text>
            </View>
            <View
              onClick={() => Taro.navigateTo({ url: '/pages/heart/user' })}
              style={{
                width: '168rpx',
                height: '72rpx',
                borderRadius: '12rpx',
                background: '#F7F8FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '37rpx' }}>查看主页</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
