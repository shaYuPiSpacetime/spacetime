import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import HeartMessageHeader from '@/components/HeartMessageHeader'
import avatarImage from '@/assets/lanhu/heart-message/heart-avatar.webp'
import { getMutualMatches, type MutualMatchItemVO, type MutualMatchPageVO } from '@/services/relation'

const fallbackPeople: MutualMatchItemVO[] = [
  { matchNo: 'MAT-DEMO-1', userId: 1, nickname: '一只筱脑虎', avatar: null, age: 25, currentCity: '浙江杭州', hometownCity: '河南', canEnterConversation: true },
  { matchNo: 'MAT-DEMO-2', userId: 2, nickname: '温柔晚风', avatar: null, age: 27, currentCity: '浙江杭州', hometownCity: '山东', canEnterConversation: true },
  { matchNo: 'MAT-DEMO-3', userId: 3, nickname: '山海同路', avatar: null, age: 28, currentCity: '上海', hometownCity: '杭州', canEnterConversation: true },
  { matchNo: 'MAT-DEMO-4', userId: 4, nickname: '晴天', avatar: null, age: 26, currentCity: '杭州', hometownCity: '郑州', canEnterConversation: false },
]
const fallbackTitle = '相互喜欢(4人)'

export default function MutualLikesPage() {
  const [page, setPage] = useState<MutualMatchPageVO | null>(null)
  const [records, setRecords] = useState<MutualMatchItemVO[]>([])

  useEffect(() => {
    getMutualMatches(1, 20)
      .then(data => {
        setPage(data)
        setRecords(data.records || [])
      })
      .catch(error => {
        setRecords(fallbackPeople)
        Taro.showToast({ title: error instanceof Error ? error.message : '相互喜欢加载失败', icon: 'none' })
      })
  }, [])

  const people = records.length ? records : fallbackPeople
  const title = page ? `相互喜欢(${page.total}人)` : fallbackTitle

  return (
    <View style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'PingFang SC, sans-serif' }}>
      <HeartMessageHeader title={title} align="center" showBack />
      <View style={{ width: '700rpx', margin: '0 auto' }}>
        {people.map((person, index) => (
          <View
            key={person.matchNo}
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
            <Image src={person.avatar || avatarImage} mode="aspectFill" style={{ width: '100rpx', height: '100rpx', borderRadius: '50%' }} />
            <View style={{ flex: 1, minWidth: 0, marginLeft: '20rpx' }}>
              <Text style={{ display: 'block', color: '#333333', fontSize: '28rpx', fontWeight: 500, lineHeight: '40rpx' }}>{person.nickname}</Text>
              <Text style={{ display: 'block', marginTop: '10rpx', color: '#999999', fontSize: '20rpx', lineHeight: '28rpx' }}>
                {buildLocation(person)}
              </Text>
            </View>
            <View
              onClick={() => Taro.navigateTo({ url: `/pages/heart/user?targetUserId=${person.userId}&sourceScene=profile` })}
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

function buildLocation(person: MutualMatchItemVO): string {
  const city = person.currentCity ? `现居${person.currentCity}` : ''
  const hometown = person.hometownCity ? `${person.hometownCity}人` : ''
  const profile = [person.age ? `${person.age}岁` : '', person.height ? `${person.height}cm` : ''].filter(Boolean).join('·')
  return [city, hometown, profile].filter(Boolean).join('·') || '现居浙江杭州·河南人'
}
