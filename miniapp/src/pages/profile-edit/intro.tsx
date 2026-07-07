import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import { getDemoPageData } from '@/services/lanhuDemo'

type ProfileDemo = {
  editProfile: {
    intro: {
      title: string
      placeholder: string
      value: string
      limitText: string
    }
  }
}

const profileDemo = getDemoPageData('profile') as ProfileDemo
const mainBlue = '#2876FF'
const titleColor = '#0C285A'
const pageBackground =
  'linear-gradient(90deg, rgba(233,253,251,0.6) 0%, rgba(234,238,249,0.6) 48%, rgba(248,250,239,0.6) 100%)'

export default function ProfileEditIntroPage() {
  const intro = profileDemo.editProfile.intro
  const [value, setValue] = useState(intro.value)

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.redirectTo({ url: '/pages/profile/edit' }) })
  }

  const handleSave = () => {
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(handleBack, 500)
  }

  return (
    <View style={{ minHeight: '100vh', background: pageBackground }}>
      <ProfileEditSubNav title={intro.title || '自我介绍'} onBack={handleBack} />
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
              placeholder={intro.placeholder}
              placeholderStyle="color:#999999;font-size:28rpx;line-height:48rpx"
              maxlength={200}
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
              {`${value.length}/200`}
            </Text>
          </View>
          <View
            onClick={handleSave}
            style={{
              width: '700rpx',
              height: '98rpx',
              borderRadius: '49rpx',
              background: mainBlue,
              marginTop: '42rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: '32rpx', lineHeight: '45rpx', fontWeight: 700 }}>保存自我介绍</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function ProfileEditSubNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ position: 'relative', width: '750rpx', height: '164rpx' }}>
      <View
        onClick={onBack}
        style={{
          position: 'absolute',
          left: '18rpx',
          top: '82rpx',
          width: '86rpx',
          height: '72rpx',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: titleColor, fontSize: '54rpx', lineHeight: '60rpx', fontWeight: 300 }}>‹</Text>
      </View>
      <Text
        style={{
          position: 'absolute',
          left: '0',
          top: '98rpx',
          width: '750rpx',
          color: titleColor,
          fontSize: '32rpx',
          lineHeight: '45rpx',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </View>
  )
}
