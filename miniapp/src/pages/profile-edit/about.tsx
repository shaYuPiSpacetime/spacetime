import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'

type AboutTopic = {
  key: string
  title: string
  placeholder: string
  value: string
}

type ProfileDemo = {
  editProfile: {
    aboutTopics: AboutTopic[]
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

export default function ProfileEditAboutPage() {
  const router = useRouter()
  const topic = String(router.params.topic || '')
  const topics = profileDemo.editProfile.aboutTopics
  const activeTopic = topics.find((item) => item.key === topic) || topics[0]
  const [value, setValue] = useState(activeTopic?.value || '')

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/profile/edit' }) })
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(handleBack, 500)
  }

  if (!topic) {
    return (
      <View style={{ minHeight: '100vh', background: pageBackground }}>
        <ProfileEditSubNav title="关于我" onBack={handleBack} />
        <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
          <View style={{ width: '750rpx', padding: '20rpx 25rpx 120rpx', boxSizing: 'border-box' }}>
            {topics.map((item) => (
              <View
                key={item.key}
                onClick={() => Taro.redirectTo({ url: `/pages/profile-edit/about?topic=${item.key}` })}
                style={{
                  width: '700rpx',
                  minHeight: '112rpx',
                  borderRadius: '8rpx',
                  background: '#FFFFFF',
                  marginBottom: '18rpx',
                  padding: '24rpx 26rpx',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: '24rpx', boxSizing: 'border-box' }}>
                  <Text style={{ display: 'block', color: titleColor, fontSize: '30rpx', lineHeight: '42rpx', fontWeight: 700 }}>
                    {item.title}
                  </Text>
                  {item.value ? (
                    <Text numberOfLines={1} style={{ display: 'block', color: '#8A93A5', fontSize: '24rpx', lineHeight: '34rpx', marginTop: '8rpx' }}>
                      {item.value}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: '#C0C5D0', fontSize: '38rpx', lineHeight: '38rpx' }}>›</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <ProfileEditSubNav title={activeTopic?.title || '见面便好'} onBack={handleBack} />
      <ScrollView scrollY style={{ height: 'calc(100vh - 164rpx)', width: '750rpx' }} showScrollbar={false}>
        <View style={{ width: '750rpx', padding: '22rpx 25rpx 160rpx', boxSizing: 'border-box' }}>
          <View
            style={{
              width: '700rpx',
              minHeight: '474rpx',
              borderRadius: '8rpx',
              background: '#FFFFFF',
              padding: '30rpx',
              boxSizing: 'border-box',
            }}
          >
            <Textarea
              value={value}
              placeholder={activeTopic?.placeholder || '写下你的想法'}
              placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
              maxlength={120}
              onInput={(event) => setValue(event.detail.value)}
              style={{
                width: '640rpx',
                minHeight: '366rpx',
                color: '#333333',
                fontSize: '28rpx',
                lineHeight: '48rpx',
                background: '#FFFFFF',
              }}
            />
            <Text style={{ display: 'block', color: '#999999', fontSize: '22rpx', lineHeight: '32rpx', textAlign: 'right' }}>
              {`${value.length}/120`}
            </Text>
          </View>
          <View onClick={handleSave} style={{ width: '700rpx', height: '98rpx', borderRadius: '49rpx', background: mainBlue, marginTop: '42rpx', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>保存</Text>
          </View>
        </View>
      </ScrollView>
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
