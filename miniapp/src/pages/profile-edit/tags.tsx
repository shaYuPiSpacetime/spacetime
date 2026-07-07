import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'

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
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

export default function ProfileEditTagsPage() {
  const [selectedTags, setSelectedTags] = useState(profileDemo.defaultSelectedTags)

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/profile/edit' }) })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag)
      return [...current, tag]
    })
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(handleBack, 500)
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <ProfileEditSubNav title="我的标签" onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '20rpx 25rpx 172rpx', boxSizing: 'border-box' }}>
          {profileDemo.tagGroups.map((group) => (
            <View key={group.title} style={{ width: '700rpx', marginBottom: '34rpx' }}>
              <Text style={{ display: 'block', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>
                {group.title}
              </Text>
              <Text style={{ display: 'block', color: '#8A93A5', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>
                {group.subtitle}
              </Text>
              <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: '22rpx' }}>
                {group.tags.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <View
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        height: '72rpx',
                        borderRadius: '12rpx',
                        background: active ? '#E3F1FE' : '#FFFFFF',
                        border: active ? `2rpx solid ${mainBlue}` : '2rpx solid transparent',
                        padding: '0 28rpx',
                        marginRight: '18rpx',
                        marginBottom: '18rpx',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Text style={{ color: active ? mainBlue : '#333333', fontSize: '26rpx', lineHeight: '37rpx', fontWeight: active ? 700 : 400 }}>
                        {tag}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        onClick={handleSave}
        style={{
          position: 'fixed',
          left: '25rpx',
          bottom: '48rpx',
          width: '700rpx',
          height: '98rpx',
          borderRadius: '49rpx',
          background: mainBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>保存</Text>
      </View>
    </View>
  )
}

function ProfileEditSubNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '164rpx' }}>
      <View onClick={onBack} style={{ position: 'absolute', left: '18rpx', top: '82rpx', width: '86rpx', height: '72rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: titleColor, fontSize: '54rpx', lineHeight: '60rpx', fontWeight: 300 }}>‹</Text>
      </View>
      <Text style={{ position: 'absolute', left: '0', top: '98rpx', width: '750rpx', color: titleColor, fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 500, textAlign: 'center' }}>{title}</Text>
    </View>
  )
}
