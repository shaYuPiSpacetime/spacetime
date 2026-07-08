import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import LanhuSubNav from '@/components/LanhuSubNav'
import { getDemoPageData } from '@/services/lanhuDemo'
import { navigateBackOrRedirect } from '@/utils/navigation'

type TagGroup = {
  title: string
  subtitle: string
  tags: string[]
}

type ProfileDemo = {
  defaultSelectedTags: string[]
  tagGroups: TagGroup[]
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.72) 0%, rgba(234,238,249,0.72) 48%, rgba(248,250,239,0.72) 100%)'
const tagPalette = ['#46B957', '#3EA0FF', '#FF980E', '#B641C9', '#4E62BD', '#F45B5B']

export default function ProfileEditTagsPage() {
  const categories = ['全部', 'MBTI', '性格', '爱好', '运动', '足迹']
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [selectedTags, setSelectedTags] = useState(profileDemo.defaultSelectedTags)
  const allTags = buildTagWall(profileDemo.tagGroups)

  const handleBack = () => {
    navigateBackOrRedirect()
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag)
      if (current.length >= 16) {
        Taro.showToast({ title: '最多选择16个标签', icon: 'none' })
        return current
      }
      return [...current, tag]
    })
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <LanhuSubNav title="我的标签" onBack={handleBack} />
      <ScrollView scrollX style={{ width: '750rpx', height: '96rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
        <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: '28rpx', boxSizing: 'border-box', height: '96rpx' }}>
          {categories.map((category) => {
            const active = category === activeCategory
            return (
              <View
                key={category}
                onClick={() => setActiveCategory(category)}
                style={{
                  position: 'relative',
                  minWidth: category === '全部' ? '108rpx' : '136rpx',
                  height: '58rpx',
                  borderRadius: '12rpx',
                  background: active ? mainBlue : '#E3F1FE',
                  marginRight: '12rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 24rpx',
                  boxSizing: 'border-box',
                }}
              >
                <Text style={{ color: active ? '#FFFFFF' : '#7F8494', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: active ? 800 : 500 }}>
                  {category}
                </Text>
                {active ? (
                  <View
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: '-14rpx',
                      width: '0',
                      height: '0',
                      marginLeft: '-11rpx',
                      borderLeft: '11rpx solid transparent',
                      borderRight: '11rpx solid transparent',
                      borderTop: `14rpx solid ${mainBlue}`,
                    }}
                  />
                ) : null}
              </View>
            )
          })}
        </View>
      </ScrollView>

      <ScrollView scrollY style={{ height: 'calc(100vh - 370rpx)', width: '750rpx' }} showScrollbar={false}>
        <View
          style={{
            width: '700rpx',
            margin: '0 auto',
            borderRadius: '8rpx',
            background: '#FFFFFF',
            padding: '30rpx 27rpx 34rpx',
            boxSizing: 'border-box',
          }}
        >
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
            {allTags.map((tag, index) => {
              const active = selectedTags.includes(tag)
              const color = tagPalette[index % tagPalette.length]
              return (
                <View
                  key={`${tag}-${index}`}
                  onClick={() => toggleTag(tag)}
                  style={{
                    width: '206rpx',
                    height: '88rpx',
                    borderRadius: '12rpx',
                    background: active ? color : '#FAFBFD',
                    border: active ? '0' : '2rpx solid #E5E8EF',
                    marginRight: (index + 1) % 3 === 0 ? '0' : '14rpx',
                    marginBottom: '14rpx',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  <Text style={{ color: active ? '#FFFFFF' : color, fontSize: '28rpx', lineHeight: '40rpx', fontWeight: active ? 800 : 500 }}>
                    {tag}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'fixed',
          left: '0',
          right: '0',
          bottom: '0',
          minHeight: '206rpx',
          borderRadius: '32rpx 32rpx 0 0',
          background: '#FFFFFF',
          padding: '32rpx 30rpx calc(28rpx + env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
          boxShadow: '0 -10rpx 28rpx rgba(12,40,90,0.08)',
        }}
      >
        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: '#333333', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 800 }}>{`已添加 ${selectedTags.length}/16`}</Text>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <Text style={{ color: '#999999', fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 800 }}>展开⌃</Text>
          </View>
        </View>
        <ScrollView scrollX style={{ width: '690rpx', height: '64rpx', marginTop: '32rpx', whiteSpace: 'nowrap' }} showScrollbar={false}>
          <View style={{ display: 'flex', flexDirection: 'row' }}>
            {selectedTags.map((tag) => (
              <View
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  height: '48rpx',
                  borderRadius: '12rpx',
                  border: '2rpx solid #E2E5EC',
                  padding: '0 18rpx',
                  marginRight: '14rpx',
                  display: 'flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                <Text style={{ color: '#333333', fontSize: '26rpx', lineHeight: '36rpx' }}>{tag} ×</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

function buildTagWall(groups: TagGroup[]) {
  const seed = ['ISTJ物流师', 'ISFJ守卫者', 'INFJ提倡者', 'INTJ建筑师', 'ISTP技术专家', 'ISFP艺术家']
  const fromData = groups.flatMap((group) => group.tags)
  return [...seed, ...fromData, ...seed.slice(0, 6), ...fromData.slice(0, 9)]
}
